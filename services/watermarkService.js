const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs-extra');

module.exports = {
  addWatermark: async (inputPath, outputPath, watermarkText, options = {}) => {
    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      const {
        fontSize = 50,
        opacity = 0.3,
        rotation = -45,
        color = rgb(0.5, 0.5, 0.5)
      } = options;

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        page.drawText(watermarkText, {
          x: width / 2 - fontSize * 2,
          y: height / 2,
          size: fontSize,
          opacity: opacity,
          rotate: rotation,
          color: color
        });
      }

      const watermarkedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, watermarkedPdfBytes);
      
      return outputPath;
    } catch (error) {
      console.error('Error in addWatermark:', error);
      throw new Error('Failed to add watermark: ' + error.message);
    }
  }
};