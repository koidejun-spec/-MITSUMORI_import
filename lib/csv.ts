import { EstimateItem } from './types'

function escapeCSV(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateCSV(items: EstimateItem[]): string {
  const headers = [
    'No',
    'カテゴリ',
    '項目名',
    '仕様',
    '数量',
    '単位',
    '単価',
    '金額',
    '原価',
    '粗利',
    '粗利率',
    '備考',
  ]

  const activeItems = items.filter((item) => !item.excluded)

  const rows = activeItems.map((item, index) => {
    const sellingUnitPrice = item.sellingUnitPrice
    const quantity = item.quantity

    // 売値合計（単価×数量）を1行の合計額として確定する
    const sellingAmount = sellingUnitPrice != null && quantity != null
      ? Math.round(sellingUnitPrice * quantity)
      : sellingUnitPrice != null
      ? Math.round(sellingUnitPrice)
      : null

    // 原価合計は業者の見積書と完全一致させるため item.amount をそのまま使用
    const costTotal = item.amount

    const grossProfit = sellingAmount != null && costTotal != null
      ? sellingAmount - costTotal
      : null

    const grossProfitRate = grossProfit != null && sellingAmount != null && sellingAmount !== 0
      ? Math.round((grossProfit / sellingAmount) * 1000) / 10
      : null

    // DRMへは「数量=1・単位=式・単価=合計額」で出力することで原価合計を正確に保つ
    return [
      escapeCSV(index + 1),
      escapeCSV(item.category),
      escapeCSV(item.itemName),
      escapeCSV(item.specification),
      escapeCSV(1),
      escapeCSV('式'),
      escapeCSV(sellingAmount),
      escapeCSV(sellingAmount),
      escapeCSV(costTotal),
      escapeCSV(grossProfit),
      escapeCSV(grossProfitRate != null ? `${grossProfitRate}%` : null),
      escapeCSV(item.remarks),
    ]
  })

  const lines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.join(',')),
  ]

  // BOM付きUTF-8 (Excel互換)
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadCSV(items: EstimateItem[], filename = '見積取込データ.csv'): void {
  const csv = generateCSV(items)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
