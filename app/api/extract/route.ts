import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProcessingResult } from '@/lib/types'
import { processExcel } from '@/lib/extractors/excel'
import { processPDF } from '@/lib/extractors/pdf'
import { processImage } from '@/lib/extractors/image'

export const maxDuration = 120

async function processFile(file: File): Promise<ProcessingResult> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const name = file.name.toLowerCase()
  const type = file.type

  if (name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheet') || type.includes('excel')) {
    return processExcel(file.name, buffer)
  }
  if (name.endsWith('.pdf') || type === 'application/pdf') {
    return processPDF(file.name, buffer)
  }
  if (type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
    return processImage(file.name, buffer, type || 'image/jpeg')
  }

  throw new Error(`未対応のファイル形式です: ${file.name}`)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    const results: ProcessingResult[] = []
    for (let i = 0; i < files.length; i++) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1000))
      try {
        results.push(await processFile(files[i]))
      } catch (err) {
        results.push({
          fileName: files[i].name,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('Extract API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'サーバーエラーが発生しました' },
      { status: 500 },
    )
  }
}
