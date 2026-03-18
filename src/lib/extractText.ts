import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import officeParser from 'officeparser'
import Tesseract from 'tesseract.js'

// Need this to avoid worker errors in node environments or setup the fake worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'

export async function extractText(file: File): Promise<string> {
  const fileType = file.type
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (fileType === 'application/pdf') {
    return await extractPdfText(arrayBuffer)
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

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buffer)
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    standardFontDataUrl: `node_modules/pdfjs-dist/standard_fonts/`
  })
  
  const pdf = await loadingTask.promise
  let text = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: any) => item.str).join(' ') + '\n'
  }
  
  return text
}

async function extractPptText(buffer: Buffer): Promise<string> {
  const result = await officeParser.parseOffice(buffer)
  return typeof result === 'string' ? result : String(result) || ''
}

async function extractImageText(buffer: Buffer): Promise<string> {
  const result = await Tesseract.recognize(buffer, 'eng')
  return result.data.text.replace(/\s+/g, ' ').trim()
}
