const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { pdf2pic } = require('pdf2pic');

module.exports = {
  convertToImage: async (inputPath, outputDir, format = 'png', dpi = 300) => {
    try {
      const options = {
        density: dpi,
        saveFilename: "page",
        savePath: outputDir,
        format,
        width: 2480,
        height: 3508
      };

      const convert = pdf2pic(options);
      const pdfBuffer = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      const outputPaths = [];
      
      for (let i = 1; i <= pageCount; i++) {
        const result = await convert(inputPath, i);
        outputPaths.push(result.path);
      }

      return outputPaths;
    } catch (error) {
      console.error('Error in convertToImage:', error);
      throw new Error('Failed to convert PDF to images: ' + error.message);
    }
  }
};