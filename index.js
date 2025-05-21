const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const compression = require('compression');
const cors = require('cors');
const pdfRoutes = require('./routes/pdfRoutes');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);
const processedDir = path.join(__dirname, 'processed');
fs.ensureDirSync(processedDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create a unique folder for this upload session
    const sessionId = req.body.sessionId || uuidv4();
    const sessionDir = path.join(uploadsDir, sessionId);
    fs.ensureDirSync(sessionDir);
    
    if (!req.body.sessionId) {
      req.body.sessionId = sessionId;
    }
    
    cb(null, sessionDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// PDF operation routes
app.use('/pdf', pdfRoutes(upload));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Clean up temporary files
const cleanUpInterval = 1000 * 60 * 60; // 1 hour
setInterval(() => {
  try {
    const uploadFolders = fs.readdirSync(uploadsDir);
    const now = Date.now();
    
    uploadFolders.forEach(folder => {
      const folderPath = path.join(uploadsDir, folder);
      const stats = fs.statSync(folderPath);
      
      // Remove folders older than 1 hour
      if (now - stats.mtimeMs > cleanUpInterval) {
        fs.removeSync(folderPath);
      }
    });
    
    // Also clean processed files
    const processedFiles = fs.readdirSync(processedDir);
    processedFiles.forEach(file => {
      const filePath = path.join(processedDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > cleanUpInterval) {
        fs.removeSync(filePath);
      }
    });
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
  }
}, cleanUpInterval);