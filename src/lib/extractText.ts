import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

export async function extractText(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      return data.text || '';
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      return value || '';
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    } else if (fileType.startsWith('image/')) {
      return await extractImageText(buffer);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileType === 'application/vnd.ms-powerpoint' ||
      fileName.endsWith('.pptx') || 
      fileName.endsWith('.ppt')
    ) {
      return 'placeholder text for now';
    } else {
      console.warn(`Unsupported file type: ${fileType}. Falling back to empty text.`);
      return '';
    }
  } catch (error) {
    console.warn(`Error extracting text from ${file.name}:`, error);
    return ''; // Return empty string so manual content can be fallback
  }
}

async function extractImageText(buffer: Buffer): Promise<string> {
  try {
    const result = await Tesseract.recognize(buffer, 'eng');
    return result.data.text.replace(/\s+/g, ' ').trim();
  } catch(error) {
    console.warn("Tesseract OCR failed:", error);
    return '';
  }
}
