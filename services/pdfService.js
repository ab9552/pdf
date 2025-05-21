const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');

/**
 * Service for PDF manipulation operations
 */
module.exports = {
  /**
   * Merge multiple PDF files into one
   * @param {string[]} inputPaths - Array of paths to PDF files
   * @param {string} outputPath - Path to save merged PDF
   * @returns {Promise<string>} - Path to merged PDF
   */
  mergePdfs: async (inputPaths, outputPath) => {
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const inputPath of inputPaths) {
        const pdfBytes = await fs.readFile(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      await fs.writeFile(outputPath, mergedPdfBytes);
      
      return outputPath;
    } catch (error) {
      console.error('Error in mergePdfs:', error);
      throw new Error('Failed to merge PDFs: ' + error.message);
    }
  },
  
  /**
   * Split a PDF into multiple files based on page ranges
   * @param {string} inputPath - Path to the PDF file
   * @param {string} outputDir - Directory to save split PDFs
   * @param {string} outputId - Unique ID for the output files
   * @param {string} pageRanges - Page ranges in format "1,3-5,7"
   * @returns {Promise<string[]>} - Array of paths to split PDFs
   */
  splitPdf: async (inputPath, outputDir, outputId, pageRanges) => {
    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const totalPages = pdf.getPageCount();
      
      // Parse page ranges (e.g., "1,3-5,7")
      const ranges = pageRanges.split(',').map(range => {
        if (range.includes('-')) {
          const [start, end] = range.split('-').map(n => parseInt(n.trim(), 10));
          return { start: start - 1, end: end - 1 }; // Convert to 0-based indexing
        } else {
          const page = parseInt(range.trim(), 10) - 1; // Convert to 0-based indexing
          return { start: page, end: page };
        }
      });
      
      // Validate page ranges
      for (const range of ranges) {
        if (range.start < 0 || range.end >= totalPages || range.start > range.end) {
          throw new Error(`Invalid page range: ${range.start + 1}-${range.end + 1}. Document has ${totalPages} pages.`);
        }
      }
      
      const outputPaths = [];
      
      // Extract each range to a separate PDF
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const extractedPdf = await PDFDocument.create();
        
        // Copy pages from the range
        for (let pageIndex = range.start; pageIndex <= range.end; pageIndex++) {
          const [copiedPage] = await extractedPdf.copyPages(pdf, [pageIndex]);
          extractedPdf.addPage(copiedPage);
        }
        
        // Save extracted PDF
        const outputPath = path.join(outputDir, `split-${outputId}-${i + 1}.pdf`);
        const extractedPdfBytes = await extractedPdf.save();
        await fs.writeFile(outputPath, extractedPdfBytes);
        outputPaths.push(outputPath);
      }
      
      return outputPaths;
    } catch (error) {
      console.error('Error in splitPdf:', error);
      throw new Error('Failed to split PDF: ' + error.message);
    }
  },
  
  /**
   * Compress a PDF file
   * @param {string} inputPath - Path to the PDF file
   * @param {string} outputPath - Path to save compressed PDF
   * @param {string} quality - Compression quality ('low', 'medium', 'high')
   * @returns {Promise<string>} - Path to compressed PDF
   */
  compressPdf: async (inputPath, outputPath, quality) => {
    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Basic compression settings
      let compressionOptions = {};
      
      switch (quality) {
        case 'low':
          compressionOptions = { compress: true, objectMode: true };
          break;
        case 'medium':
          compressionOptions = { compress: true };
          break;
        case 'high':
          // Less compression, higher quality
          compressionOptions = {};
          break;
        default:
          compressionOptions = { compress: true };
      }
      
      // Save with compression options
      const compressedPdfBytes = await pdfDoc.save(compressionOptions);
      await fs.writeFile(outputPath, compressedPdfBytes);
      
      return outputPath;
    } catch (error) {
      console.error('Error in compressPdf:', error);
      throw new Error('Failed to compress PDF: ' + error.message);
    }
  }
};