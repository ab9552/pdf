const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const pdfService = require('../services/pdfService');

module.exports = function(upload) {
  const router = express.Router();
  const processedDir = path.join(__dirname, '../processed');
  
  // Merge PDFs
  router.post('/merge', upload.array('pdfFiles', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length < 2) {
        return res.status(400).json({ error: 'Please upload at least 2 PDF files' });
      }
      
      const filePaths = req.files.map(file => file.path);
      const outputPath = path.join(processedDir, `merged-${uuidv4()}.pdf`);
      
      await pdfService.mergePdfs(filePaths, outputPath);
      
      const downloadUrl = `/download/${path.basename(outputPath)}`;
      res.json({ success: true, downloadUrl });
    } catch (error) {
      console.error('Error merging PDFs:', error);
      res.status(500).json({ error: error.message || 'Error merging PDFs' });
    }
  });
  
  // Split PDF
  router.post('/split', upload.single('pdfFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a PDF file' });
      }
      
      const { pages } = req.body;
      if (!pages) {
        return res.status(400).json({ error: 'Please specify pages to extract' });
      }
      
      const outputId = uuidv4();
      const outputFiles = await pdfService.splitPdf(
        req.file.path, 
        processedDir, 
        outputId, 
        pages
      );
      
      const downloadUrls = outputFiles.map(file => `/download/${path.basename(file)}`);
      res.json({ success: true, downloadUrls });
    } catch (error) {
      console.error('Error splitting PDF:', error);
      res.status(500).json({ error: error.message || 'Error splitting PDF' });
    }
  });
  
  // Compress PDF
  router.post('/compress', upload.single('pdfFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a PDF file' });
      }
      
      const quality = req.body.quality || 'medium';
      const outputPath = path.join(processedDir, `compressed-${uuidv4()}.pdf`);
      
      await pdfService.compressPdf(req.file.path, outputPath, quality);
      
      const downloadUrl = `/download/${path.basename(outputPath)}`;
      const stats = fs.statSync(outputPath);
      const originalStats = fs.statSync(req.file.path);
      const compressionRatio = (originalStats.size / stats.size).toFixed(2);
      
      res.json({ 
        success: true, 
        downloadUrl, 
        originalSize: originalStats.size, 
        compressedSize: stats.size, 
        compressionRatio 
      });
    } catch (error) {
      console.error('Error compressing PDF:', error);
      res.status(500).json({ error: error.message || 'Error compressing PDF' });
    }
  });
  
  // Download route
  router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(processedDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).render('error', { message: 'File not found' });
    }
    
    res.download(filePath);
  });
  
  return router;
};