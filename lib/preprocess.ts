import sharp from 'sharp'

const MAX_DIMENSION = 2000   // Claude視覚認識の最適解像度
const PDF_MAX_PAGES = 10     // これを超えたらDocument Blockにフォールバック
const PDF_RENDER_SCALE = 2.0 // PDF → 画像の解像度倍率

/**
 * 画像バッファを前処理してOCR精度を上げる
 * - 最大2000pxまでアップスケール（小さい画像も引き伸ばす）
 * - コントラスト自動正規化
 * - シャープ化
 * - JPEG 85%品質に変換（送信サイズ削減）
 */
export async function preprocessImageBuffer(buffer: Buffer): Promise<{ buffer: Buffer; mediaType: 'image/jpeg' }> {
  const processed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .normalize()
    .sharpen({ sigma: 1.2 })
    .jpeg({ quality: 85 })
    .toBuffer()

  return { buffer: processed, mediaType: 'image/jpeg' }
}

/**
 * PDFを画像配列に変換して前処理する
 * PDF_MAX_PAGESを超える場合はnullを返してDocument Blockにフォールバックさせる
 */
export async function pdfToPreprocessedImages(
  buffer: Buffer,
): Promise<{ buffer: Buffer; mediaType: 'image/jpeg' }[] | null> {
  let pdfjsLib: typeof import('pdfjs-dist')
  let createCanvas: (width: number, height: number) => import('canvas').Canvas

  try {
    pdfjsLib = await import('pdfjs-dist')
    const canvasModule = await import('canvas')
    createCanvas = canvasModule.createCanvas
  } catch {
    return null
  }

  // Node.js環境ではWorkerを使わない
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>>['promise'] extends Promise<infer T> ? T : never
  try {
    pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
    }).promise
  } catch {
    return null
  }

  // ページ数が多すぎる場合はDocument Blockの方が適切
  if (pdf.numPages > PDF_MAX_PAGES) {
    return null
  }

  const images: { buffer: Buffer; mediaType: 'image/jpeg' }[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })

    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height))
    const ctx = canvas.getContext('2d')

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise

    const pngBuffer = canvas.toBuffer('image/png')
    const preprocessed = await preprocessImageBuffer(pngBuffer)
    images.push(preprocessed)
  }

  return images
}
