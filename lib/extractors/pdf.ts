import { ProcessingResult } from '../types'
import { callClaudeWithDocument, callClaudeWithMultipleImages } from './claude'
import { pdfToPreprocessedImages } from '../preprocess'

export async function processPDF(fileName: string, buffer: Buffer): Promise<ProcessingResult> {
  const MAX_PDF_BYTES = 20 * 1024 * 1024
  if (buffer.length > MAX_PDF_BYTES) {
    const sizeMB = Math.round(buffer.length / 1024 / 1024)
    throw new Error(`PDFが大きすぎます（${sizeMB}MB）。20MB以下のファイルを使用してください。`)
  }

  // PDFを画像に変換して前処理（OCR精度向上）
  // 10ページ超またはレンダリング失敗時はDocument Blockにフォールバック
  const images = await pdfToPreprocessedImages(buffer)
  if (images !== null) {
    const extraction = await callClaudeWithMultipleImages(images, fileName)
    return { fileName, status: 'success', ...extraction }
  }

  // フォールバック：Document Block（テキストPDFや大量ページPDF）
  const base64 = buffer.toString('base64')
  const extraction = await callClaudeWithDocument(base64, 'application/pdf', fileName)
  return { fileName, status: 'success', ...extraction }
}
