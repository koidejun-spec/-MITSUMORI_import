import { ProcessingResult } from './types'

/** 見積書ファイルをAPIに送信して抽出結果を返す */
export async function extractFromFiles(files: File[]): Promise<ProcessingResult[]> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))

  const res = await fetch('/api/extract', { method: 'POST', body: formData })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'サーバーエラー' }))
    throw new Error(err.error || 'サーバーエラーが発生しました')
  }

  const data = await res.json()
  return data.results || []
}
