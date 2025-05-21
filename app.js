const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs-extra');
const {
  mergePDFs,
  splitPDF,
  compressPDF,
  pdfToWord,
  pdfToImage,
  addWatermark,
  rotatePDF,
  deletePages
} = require('./utils/pdfOperations');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const UserSubscription = require('./models/UserSubscription');
const ConversionHistory = require('./models/ConversionHistory');
const FileMetadata = require('./models/FileMetadata');
const initDatabase = require('./config/init-db');

const app = express();

// Initialize database
initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1); // Exit if database initialization fails
  });

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// User middleware
app.use(async (req, res, next) => {
  res.locals.user = null;
  if (req.session.userId) {
    try {
      const user = await User.findByPk(req.session.userId);
      res.locals.user = user;
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }
  next();
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Ensure required directories exist
fs.ensureDirSync('uploads');
fs.ensureDirSync('processed');

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: res.locals.user });
});

// Registration
app.post('/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  const password_hash = await bcrypt.hash(password, 10);
  try {
    await User.create({ email, password_hash, first_name, last_name });
    res.redirect('/');
  } catch (err) {
    res.status(400).send('Registration failed: ' + err.message);
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (user && await bcrypt.compare(password, user.password_hash)) {
    req.session.userId = user.id;
    res.redirect('/');
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Subscription
app.post('/subscribe', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login required');
  const { plan_id } = req.body;
  const plan = await SubscriptionPlan.findByPk(plan_id);
  if (!plan) return res.status(400).send('Invalid plan');
  await UserSubscription.create({
    user_id: req.session.userId,
    plan_id,
    start_date: new Date(),
    end_date: new Date(Date.now() + 30*24*60*60*1000), // 30 days
    status: 'active',
    payment_status: 'paid'
  });
  res.redirect('/');
});

// Conversion history API
app.get('/api/conversion-history', async (req, res) => {
  if (!req.session.userId) return res.json([]);
  const history = await ConversionHistory.findAll({
    where: { user_id: req.session.userId },
    order: [['created_at', 'DESC']],
    limit: 20
  });
  res.json(history);
});

// Merge PDFs
app.post('/merge', upload.array('pdfs', 10), async (req, res) => {
  try {
    const result = await mergePDFs(req.files);
    let userId = req.session.userId || null;
    const conversion = await ConversionHistory.create({
      user_id: userId,
      original_filename: req.files.map(f => f.originalname).join(', '),
      original_file_size: req.files.reduce((sum, f) => sum + f.size, 0),
      converted_filename: result.split('/').pop(),
      converted_file_size: (await fs.stat(result)).size,
      conversion_type: 'merge',
      status: 'completed'
    });
    await FileMetadata.create({
      conversion_id: conversion.id,
      file_path: result,
      file_type: 'pdf',
    });
    res.download(result, 'merged.pdf');
  } catch (error) {
    res.status(500).send('Merge failed: ' + error.message);
  }
});

// Split PDF
app.post('/split', upload.single('pdf'), async (req, res) => {
  try {
    const pages = req.body.pages.split(',').map(Number);
    const result = await splitPDF(req.file, pages);
    res.json({ success: true, file: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compress PDF
app.post('/compress', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const result = await compressPDF(req.file);
    
    // Clean up the uploaded file
    await fs.remove(req.file.path);
    
    res.json(result);
  } catch (error) {
    console.error('Error in PDF compression:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Convert to Word
app.post('/to-word', upload.single('pdf'), async (req, res) => {
  try {
    const filename = await pdfToWord(req.file);
    res.json({ 
      success: true, 
      file: filename,
      downloadUrl: `/download/${filename}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Convert to Image
app.post('/convert-to-image', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await pdfToImage(req.file.path);
        
        // Clean up the uploaded file
        await fs.remove(req.file.path);
        
        res.json(result);
    } catch (error) {
        console.error('Error in PDF to image conversion:', error);
        res.status(500).json({ error: 'Failed to convert PDF to image' });
    }
});

// Add Watermark
app.post('/watermark', upload.single('pdf'), async (req, res) => {
  try {
    const filename = await addWatermark(req.file, req.body.watermarkText);
    res.json({ 
      success: true, 
      file: filename,
      downloadUrl: `/download/${filename}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotate PDF
app.post('/rotate', upload.single('pdf'), async (req, res) => {
  try {
    const filename = await rotatePDF(req.file, parseInt(req.body.angle));
    res.json({ 
      success: true, 
      file: filename,
      downloadUrl: `/download/${filename}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Pages
app.post('/delete-pages', upload.single('pdf'), async (req, res) => {
  try {
    const pages = req.body.pages.split(',').map(Number);
    const filename = await deletePages(req.file, pages);
    res.json({ 
      success: true, 
      file: filename,
      downloadUrl: `/download/${filename}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download file
app.get('/download/:filename', async (req, res) => {
  try {
    // Sanitize filename to prevent directory traversal
    const filename = path.basename(req.params.filename);
    const file = path.join(__dirname, 'processed', filename);
    
    // Check if file exists
    if (!await fs.pathExists(file)) {
      console.error(`File not found: ${file}`);
      return res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }

    // Get file stats
    const stats = await fs.stat(file);
    
    // Set appropriate headers
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(file);
    fileStream.pipe(res);

    // Handle errors during streaming
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: 'Error streaming file' 
        });
      }
    });
  } catch (error) {
    console.error('Error in download route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Cleanup temporary files
const cleanupTempFiles = async () => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const processedDir = path.join(__dirname, 'processed');
    
    // Clean files older than 24 hours
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    
    const cleanupDir = async (dir) => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtimeMs < cutoffTime) {
          await fs.remove(filePath);
        }
      }
    };

    await cleanupDir(uploadsDir);
    await cleanupDir(processedDir);
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // Initial cleanup
  cleanupTempFiles().catch(console.error);
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
}); 