import * as XLSX from 'xlsx'
import { ProcessingResult } from '../types'
import { callClaudeWithText } from './claude'

function detectBestSheet(workbook: XLSX.WorkBook): string {
  const { SheetNames, Sheets } = workbook
  if (SheetNames.length === 1) return SheetNames[0]

  const DETAIL_KEYWORDS = ['明細', '内訳', '詳細', '見積', 'detail', '工事']
  const SUMMARY_KEYWORDS = ['表紙', '合計', '概要', 'サマリ', 'summary', 'cover', '集計', 'total', '注文書']

  let bestSheet = SheetNames[0]
  let maxScore = -1

  for (const name of SheetNames) {
    const ws = Sheets[name]
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

    const rowCount = data.filter(
      (row) => Array.isArray(row) && row.some((cell) => cell !== '' && cell != null),
    ).length

    let numericCount = 0
    for (const row of data) {
      if (!Array.isArray(row)) continue
      for (const cell of row) {
        if (typeof cell === 'number') numericCount += 2
        if (typeof cell === 'string' && /^[\d,，]+\.?\d*$/.test(cell.trim())) numericCount += 1
      }
    }

    let score = numericCount + rowCount
    const lowerName = name.toLowerCase()
    if (DETAIL_KEYWORDS.some((kw) => lowerName.includes(kw))) score += 100
    if (SUMMARY_KEYWORDS.some((kw) => lowerName.includes(kw))) score -= 200

    if (score > maxScore) {
      maxScore = score
      bestSheet = name
    }
  }

  return bestSheet
}

function truncateAtLineBreak(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const cut = text.lastIndexOf('\n', maxChars)
  return cut === -1 ? text.slice(0, maxChars) : text.slice(0, cut)
}

function excelSheetToStructuredText(ws: XLSX.WorkSheet): string {
  if (!ws['!ref']) return ''

  const range = XLSX.utils.decode_range(ws['!ref'])
  const merges: XLSX.Range[] = ws['!merges'] || []

  const numRows = range.e.r - range.s.r + 1
  const numCols = range.e.c - range.s.c + 1
  const grid: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''))

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: r + range.s.r, c: c + range.s.c })
      const cell = ws[addr]
      grid[r][c] = cell ? XLSX.utils.format_cell(cell) : ''
    }
  }

  for (const merge of merges) {
    const topLeftAddr = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })
    const topLeftCell = ws[topLeftAddr]
    const value = topLeftCell ? XLSX.utils.format_cell(topLeftCell) : ''

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const ri = r - range.s.r
        const ci = c - range.s.c
        if (ri >= 0 && ri < numRows && ci >= 0 && ci < numCols) {
          grid[ri][ci] = value
        }
      }
    }
  }

  const lines: string[] = []
  for (let r = 0; r < numRows; r++) {
    const row = grid[r]
    if (row.every((cell) => cell === '')) continue
    lines.push(`行${r + 1}\t${row.join('\t')}`)
  }

  return lines.join('\n')
}

export async function processExcel(fileName: string, buffer: Buffer): Promise<ProcessingResult> {
  const MAX_EXCEL_BYTES = 10 * 1024 * 1024
  if (buffer.length > MAX_EXCEL_BYTES) {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1)
    throw new Error(`Excelファイルが大きすぎます（${sizeMB}MB）。10MB以下のファイルを使用してください。`)
  }

  const workbook = XLSX.read(buffer, { type: 'buffer', cellText: false, cellDates: true })
  const selectedSheet = detectBestSheet(workbook)
  const availableSheets = workbook.SheetNames

  const ws = workbook.Sheets[selectedSheet]
  const structuredText = excelSheetToStructuredText(ws)

  const MAX_TEXT_CHARS = 80000
  const isTruncated = structuredText.length > MAX_TEXT_CHARS

  const prompt = `以下は見積書（${fileName}、シート：${selectedSheet}）をExcelから抽出したデータです。
各行は「行番号＋タブ区切りのセル値」で表現されています。セル結合は既に展開済みで、カテゴリが複数行に渡る場合も各行に同じ値が入っています。

${truncateAtLineBreak(structuredText, MAX_TEXT_CHARS)}

上記のデータから見積情報を抽出してください。`

  const extraction = await callClaudeWithText(prompt, fileName)

  if (isTruncated) {
    extraction.items = extraction.items.map((item, i) =>
      i === 0
        ? { ...item, warnings: ['データ量が多いため末尾の行が読み取れていない可能性があります', ...(item.warnings || [])] }
        : item,
    )
  }

  return { fileName, status: 'success', selectedSheet, availableSheets, ...extraction }
}
