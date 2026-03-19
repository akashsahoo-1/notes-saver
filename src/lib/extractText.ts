import officeParser from 'officeparser'
import Tesseract from 'tesseract.js'

export async function extractText(file: File): Promise<string> {
  const fileType = file.type
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (fileType === 'application/pdf') {
    throw new Error('PDF parsing is temporarily disabled.')
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileType === 'application/vnd.ms-powerpoint' ||
    file.name.endsWith('.pptx') || 
    file.name.endsWith('.ppt')
  ) {
    return await extractPptText(buffer)
  } else if (fileType.startsWith('image/')) {
    return await extractImageText(buffer)
  } else {
    throw new Error('Unsupported file type')
  }
}


async function extractPptText(buffer: Buffer): Promise<string> {
  const result = await officeParser.parseOffice(buffer)
  return typeof result === 'string' ? result : String(result) || ''
}

async function extractImageText(buffer: Buffer): Promise<string> {
  const result = await Tesseract.recognize(buffer, 'eng')
  return result.data.text.replace(/\s+/g, ' ').trim()
}
