import {
  EstimateItem,
  GlobalWarning,
  ProcessingResult,
  TotalMismatchData,
  RoundingMode,
  MarkupSettings,
} from './types'
import { applyRounding, calcSellingPrice, reverseCalcUnitPrice } from './markup'

export function recalculateSellingPrices(
  items: EstimateItem[],
  mode: RoundingMode,
  markup: MarkupSettings,
): EstimateItem[] {
  return items.map((item) => {
    if (item.sellingUnitPriceEdited) return item
    const sellingUnitPrice = item.costPrice != null
      ? calcSellingPrice(item.costPrice, item.category, markup, mode)
      : null
    return { ...item, sellingUnitPrice }
  })
}

function buildCostPriceInfo(
  item: ProcessingResult['items'] extends (infer T)[] | undefined ? T : never,
  mode: RoundingMode,
): { costPrice: number | null; extraWarnings: string[] } {
  // ProcessingResult['items'] の要素型を直接使うため、引数型を明示する
  const extracted = item as {
    unitPrice: number | null
    quantity: number | null
    unit: string
    amount: number | null
  }
  const fmt = (n: number) => n.toLocaleString('ja-JP')
  const extraWarnings: string[] = []

  // ①: 単価の記載あり → そのまま
  if (extracted.unitPrice !== null) {
    return { costPrice: extracted.unitPrice, extraWarnings }
  }

  // ②: 単価なし、数量が数値（式以外）→ 逆算（小数点2桁）
  if (extracted.quantity !== null && extracted.unit !== '式' && extracted.amount !== null) {
    const costPrice = reverseCalcUnitPrice(extracted.amount, extracted.quantity)
    extraWarnings.push(
      `逆算で計算した値です　¥${fmt(extracted.amount)} ÷ ${extracted.quantity} = ¥${fmt(costPrice)}`,
    )
    return { costPrice, extraWarnings }
  }

  // ③: 単価なし、単位が式または数量なし → 金額をそのまま
  if (extracted.amount !== null) {
    extraWarnings.push('単価の記載がないため金額をそのまま入れています')
    return { costPrice: extracted.amount, extraWarnings }
  }

  // ④: 両方読み取れない → 空欄
  return { costPrice: null, extraWarnings }
}

export function buildItems(
  results: ProcessingResult[],
  mode: RoundingMode,
  markup: MarkupSettings,
): EstimateItem[] {
  const items: EstimateItem[] = []
  for (const result of results) {
    if (result.status !== 'success' || !result.items) continue
    const vendorName = result.vendorName || ''
    for (const item of result.items) {
      const { costPrice, extraWarnings } = buildCostPriceInfo(item, mode)
      const allWarnings = [...(item.warnings || []), ...extraWarnings]
      const sellingUnitPrice = costPrice != null
        ? calcSellingPrice(costPrice, item.category, markup, mode)
        : null
      items.push({
        id: crypto.randomUUID(),
        sourceFileName: result.fileName,
        sourcePage: 1,
        sourceText: '',
        vendorName,
        category: item.category,
        itemName: item.itemName,
        specification: item.specification || '',
        quantity: item.quantity,
        unit: item.unit || '式',
        unitPrice: item.unitPrice,
        amount: item.amount,
        costPrice,
        sellingUnitPrice,
        sellingUnitPriceEdited: false,
        remarks: vendorName ? `業者：${vendorName}` : '',
        confidence: item.confidence || 'medium',
        reviewStatus: allWarnings.length > 0 || item.confidence === 'low' ? 'warning' : 'ok',
        warnings: allWarnings,
        excluded: false,
      })
    }
  }
  return items
}

export function buildWarnings(results: ProcessingResult[]): GlobalWarning[] {
  const warnings: GlobalWarning[] = []
  for (const result of results) {
    if (result.status !== 'success' || !result.items) continue

    if (result.hasTaxIncluded) {
      warnings.push({
        id: crypto.randomUUID(),
        type: 'tax',
        sourceFileName: result.fileName,
        data: { sourceFileName: result.fileName },
        acknowledged: false,
      })
    }

    if (result.totalAmount != null && result.items.length > 0) {
      const extractedTotal = result.items.reduce((sum, item) => sum + (item.amount || 0), 0)
      const diff = Math.abs(result.totalAmount - extractedTotal)
      if (diff > 100) {
        warnings.push({
          id: crypto.randomUUID(),
          type: 'total_mismatch',
          sourceFileName: result.fileName,
          data: {
            vendorTotal: result.totalAmount,
            extractedTotal,
            difference: result.totalAmount - extractedTotal,
          } as TotalMismatchData,
          acknowledged: false,
        })
      }
    }
  }
  return warnings
}
