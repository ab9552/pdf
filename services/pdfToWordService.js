const { Document, Packer, Paragraph } = require('docx');
const fs = require('fs-extra');
const path = require('path');
const Tesseract = require('node-tesseract-ocr');

const config = {
  lang: "eng",
  oem: 1,
  psm: 3,
}

module.exports = {
  convertToWord: async (inputPath, outputPath) => {
    try {
      // Extract text using OCR
      const text = await Tesseract.recognize(inputPath, config);
      
      // Create Word document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: text
            }),
          ],
        }],
      });

      // Save the document
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(outputPath, buffer);

      return outputPath;
    } catch (error) {
      console.error('Error in convertToWord:', error);
      throw new Error('Failed to convert PDF to Word: ' + error.message);
    }
  }
};