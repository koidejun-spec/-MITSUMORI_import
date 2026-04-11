import { ProcessingResult } from '../types'
import { callClaudeWithImage } from './claude'
import { preprocessImageBuffer } from '../preprocess'

export async function processImage(fileName: string, buffer: Buffer, mimeType: string): Promise<ProcessingResult> {
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024
  if (buffer.length > MAX_IMAGE_BYTES) {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1)
    throw new Error(`画像が大きすぎます（${sizeMB}MB）。5MB以下のファイルを使用してください。`)
  }

  const { buffer: processedBuffer, mediaType: processedMediaType } = await preprocessImageBuffer(buffer)
  const base64 = processedBuffer.toString('base64')
  const extraction = await callClaudeWithImage(base64, processedMediaType, fileName)

  return { fileName, status: 'success', ...extraction }
}
