const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const pdfParse = require('pdf-parse');

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const processedDir = path.join(process.cwd(), 'processed');
fs.ensureDirSync(processedDir);

// Helper function to save file
async function saveFile(data, filename) {
  try {
    const filePath = path.join(processedDir, filename);
    await fs.writeFile(filePath, data);
    return filename;
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
}

// Helper function to validate file
async function validateFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const stats = await fs.stat(file.path);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 50MB limit');
  }

  if (!file.mimetype || file.mimetype !== 'application/pdf') {
    throw new Error('Invalid file type. Only PDF files are allowed');
  }
}

// Helper function to validate page numbers
function validatePageNumbers(pages, totalPages) {
  if (!Array.isArray(pages)) {
    throw new Error('Pages must be an array');
  }

  for (const page of pages) {
    if (typeof page !== 'number' || page < 1 || page > totalPages) {
      throw new Error(`Invalid page number: ${page}. Must be between 1 and ${totalPages}`);
    }
  }
}

// Merge PDFs
async function mergePDFs(files) {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for merging');
    }

    const mergedPdf = await PDFDocument.create();
    
    for (const file of files) {
      await validateFile(file);
      const pdfBytes = await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    return await saveFile(mergedPdfBytes, `merged_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw new Error(`Failed to merge PDFs: ${error.message}`);
  }
}

// Split PDF
async function splitPDF(file, pages) {
  try {
    await validateFile(file);
    const pdfBytes = await fs.readFile(file.path);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdf.getPageCount();
    
    validatePageNumbers(pages, totalPages);
    
    const splitPdf = await PDFDocument.create();
    for (const pageNum of pages) {
      const [copiedPage] = await splitPdf.copyPages(pdf, [pageNum - 1]);
      splitPdf.addPage(copiedPage);
    }

    const splitPdfBytes = await splitPdf.save();
    return await saveFile(splitPdfBytes, `split_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error splitting PDF:', error);
    throw new Error(`Failed to split PDF: ${error.message}`);
  }
}

// Compress PDF
async function compressPDF(file) {
  try {
    await validateFile(file);
    const pdfBytes = await fs.readFile(file.path);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    // Create a new PDF document for the compressed version
    const compressedPdf = await PDFDocument.create();
    
    // Copy all pages from the original PDF
    const pages = await compressedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => compressedPdf.addPage(page));
    
    // Apply compression settings
    const compressedPdfBytes = await compressedPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
      updateMetadata: false
    });

    // Save the compressed PDF
    const filename = `compressed_${Date.now()}.pdf`;
    await saveFile(compressedPdfBytes, filename);

    return {
      success: true,
      file: filename,
      downloadUrl: `/download/${filename}`
    };
  } catch (error) {
    console.error('Error compressing PDF:', error);
    throw new Error(`Failed to compress PDF: ${error.message}`);
  }
}

// Convert PDF to Word
async function pdfToWord(file) {
  try {
    await validateFile(file);
    const pdfBytes = await fs.readFile(file.path);
    const data = await pdfParse(pdfBytes);

    // Create a Word document with better formatting
    const doc = new Document({
      sections: [{
        properties: {},
        children: data.text.split('\n').map(text => {
          // Detect headings based on text length and formatting
          if (text.length < 100 && text.toUpperCase() === text) {
            return new Paragraph({
              text: text,
              heading: HeadingLevel.HEADING_1
            });
          }
          return new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 24
              })
            ]
          });
        })
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return await saveFile(buffer, `converted_${Date.now()}.docx`);
  } catch (error) {
    console.error('Error converting PDF to Word:', error);
    throw new Error(`Failed to convert PDF to Word: ${error.message}`);
  }
}

// Convert PDF to Image
async function pdfToImage(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    const filenames = [];

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      
      // Create a new PDF with just this page
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
      singlePagePdf.addPage(copiedPage);
      
      // Convert to PNG
      const pngBytes = await singlePagePdf.saveAsBase64({ format: 'png' });
      const buffer = Buffer.from(pngBytes, 'base64');
      
      // Process with sharp for better quality
      const processedBuffer = await sharp(buffer)
        .resize(Math.round(width * 2), Math.round(height * 2)) // Double the resolution
        .png()
        .toBuffer();
      
      const filename = `converted_${Date.now()}_page${i + 1}.png`;
      await saveFile(processedBuffer, filename);
      filenames.push(filename);
    }

    return {
      success: true,
      files: filenames,
      downloadUrls: filenames.map(filename => `/download/${filename}`)
    };
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw error;
  }
}

// Add Watermark
async function addWatermark(file, watermarkText) {
  try {
    await validateFile(file);
    if (!watermarkText) {
      throw new Error('Watermark text is required');
    }

    const pdfBytes = await fs.readFile(file.path);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdf.getPages();
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      // Add diagonal watermark
      page.drawText(watermarkText, {
        x: width / 4,
        y: height / 4,
        size: 50,
        color: { r: 0.5, g: 0.5, b: 0.5, a: 0.3 },
        rotate: { type: 'degrees', angle: 45 }
      });
    }

    const watermarkedPdfBytes = await pdf.save();
    return await saveFile(watermarkedPdfBytes, `watermarked_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error adding watermark:', error);
    throw new Error(`Failed to add watermark: ${error.message}`);
  }
}

// Rotate PDF
async function rotatePDF(file, angle) {
  try {
    await validateFile(file);
    if (!angle || typeof angle !== 'number') {
      throw new Error('Valid rotation angle is required');
    }

    const pdfBytes = await fs.readFile(file.path);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdf.getPages();
    
    for (const page of pages) {
      page.setRotation(angle);
    }

    const rotatedPdfBytes = await pdf.save();
    return await saveFile(rotatedPdfBytes, `rotated_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error rotating PDF:', error);
    throw new Error(`Failed to rotate PDF: ${error.message}`);
  }
}

// Delete Pages
async function deletePages(file, pagesToDelete) {
  try {
    await validateFile(file);
    const pdfBytes = await fs.readFile(file.path);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdf.getPageCount();
    
    validatePageNumbers(pagesToDelete, totalPages);
    
    const newPdf = await PDFDocument.create();
    for (let i = 0; i < totalPages; i++) {
      if (!pagesToDelete.includes(i + 1)) {
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
      }
    }

    const newPdfBytes = await newPdf.save();
    return await saveFile(newPdfBytes, `deleted_pages_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error deleting pages:', error);
    throw new Error(`Failed to delete pages: ${error.message}`);
  }
}

// JPG to PDF
async function jpgToPdf(files) {
  // TODO: Implement JPG to PDF conversion
  throw new Error('JPG to PDF not implemented yet');
}

// Word to PDF
async function wordToPdf(file) {
  // TODO: Implement Word to PDF conversion
  throw new Error('Word to PDF not implemented yet');
}

// PowerPoint to PDF
async function pptToPdf(file) {
  // TODO: Implement PowerPoint to PDF conversion
  throw new Error('PowerPoint to PDF not implemented yet');
}

// Excel to PDF
async function excelToPdf(file) {
  // TODO: Implement Excel to PDF conversion
  throw new Error('Excel to PDF not implemented yet');
}

// HTML to PDF
async function htmlToPdf(file) {
  // TODO: Implement HTML to PDF conversion
  throw new Error('HTML to PDF not implemented yet');
}

// PDF to JPG
async function pdfToJpg(file) {
  // TODO: Implement PDF to JPG conversion
  throw new Error('PDF to JPG not implemented yet');
}

// PDF to PowerPoint
async function pdfToPpt(file) {
  // TODO: Implement PDF to PowerPoint conversion
  throw new Error('PDF to PowerPoint not implemented yet');
}

// PDF to Excel
async function pdfToExcel(file) {
  // TODO: Implement PDF to Excel conversion
  throw new Error('PDF to Excel not implemented yet');
}

// PDF to PDF/A
async function pdfToPdfA(file) {
  // TODO: Implement PDF to PDF/A conversion
  throw new Error('PDF to PDF/A not implemented yet');
}

module.exports = {
  mergePDFs,
  splitPDF,
  compressPDF,
  pdfToWord,
  pdfToImage,
  addWatermark,
  rotatePDF,
  deletePages,
  jpgToPdf,
  wordToPdf,
  pptToPdf,
  excelToPdf,
  htmlToPdf,
  pdfToJpg,
  pdfToPpt,
  pdfToExcel,
  pdfToPdfA
}; 