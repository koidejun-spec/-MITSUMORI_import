import { EstimateItem, RoundingMode, MarkupSettings } from '@/lib/types'
import { applyRounding, getMarkupRate, reverseCalcUnitPrice } from '@/lib/markup'

export function useReviewItems(
  items: EstimateItem[],
  onUpdate: (items: EstimateItem[]) => void,
  roundingMode: RoundingMode,
  markupSettings: MarkupSettings,
) {
  function update(id: string, field: keyof EstimateItem, value: unknown) {
    onUpdate(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function updateAmount(id: string, newAmount: number | null) {
    onUpdate(
      items.map((item) => {
        if (item.id !== id) return item
        let newCostPrice = item.costPrice
        if (newAmount != null) {
          if (item.quantity != null && item.unit !== '式') {
            newCostPrice = reverseCalcUnitPrice(newAmount, item.quantity)
          } else {
            newCostPrice = newAmount
          }
        } else {
          newCostPrice = null
        }
        const newSellingUnitPrice = item.sellingUnitPriceEdited
          ? item.sellingUnitPrice
          : newCostPrice != null
            ? applyRounding(newCostPrice * getMarkupRate(item.category, markupSettings), roundingMode)
            : null
        return { ...item, amount: newAmount, costPrice: newCostPrice, sellingUnitPrice: newSellingUnitPrice }
      }),
    )
  }

  function toggleExclude(id: string) {
    onUpdate(items.map((item) => (item.id === id ? { ...item, excluded: !item.excluded } : item)))
  }

  function applyBulkCategory(selectedIds: Set<string>, category: string) {
    onUpdate(items.map((item) => (selectedIds.has(item.id) ? { ...item, category } : item)))
  }

  function mergeCategory(category: string) {
    const targetItems = items.filter((i) => (i.category ?? '未分類') === category && !i.excluded)
    if (targetItems.length <= 1) return

    const totalAmount = targetItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
    const rate = getMarkupRate(category === '未分類' ? null : category, markupSettings)
    const sellingUnitPrice = applyRounding(totalAmount * rate, roundingMode)

    const hasLow = targetItems.some((i) => i.confidence === 'low')
    const hasMedium = targetItems.some((i) => i.confidence === 'medium')
    const confidence = hasLow ? 'low' : hasMedium ? 'medium' : 'high'
    const allWarnings = targetItems.flatMap((i) => i.warnings)
    const names = targetItems.map((i) => i.itemName).filter(Boolean)
    const vendors = Array.from(new Set(targetItems.map((i) => i.vendorName).filter(Boolean)))

    const merged: EstimateItem = {
      id: crypto.randomUUID(),
      sourceFileName: targetItems[0].sourceFileName,
      sourcePage: targetItems[0].sourcePage,
      sourceText: '',
      vendorName: vendors.join('、'),
      category: category === '未分類' ? null : category,
      itemName: category,
      specification: names.join('、'),
      quantity: 1,
      unit: '式',
      unitPrice: totalAmount,
      amount: totalAmount,
      costPrice: totalAmount,
      sellingUnitPrice,
      sellingUnitPriceEdited: false,
      remarks: vendors.length > 0
        ? `業者：${vendors.join('、')}（${targetItems.length}件統合）`
        : `${targetItems.length}件統合`,
      confidence,
      reviewStatus: allWarnings.length > 0 || confidence !== 'high' ? 'warning' : 'ok',
      warnings: allWarnings,
      excluded: false,
      mergedFrom: targetItems,
    }

    const targetIds = new Set(targetItems.map((i) => i.id))
    const newItems: EstimateItem[] = []
    let mergedInserted = false
    for (const item of items) {
      if (targetIds.has(item.id)) {
        if (!mergedInserted) {
          newItems.push(merged)
          mergedInserted = true
        }
      } else {
        newItems.push(item)
      }
    }
    onUpdate(newItems)
  }

  function unmergeItem(id: string) {
    const target = items.find((i) => i.id === id)
    if (!target?.mergedFrom) return
    const newItems: EstimateItem[] = []
    for (const item of items) {
      if (item.id === id) {
        newItems.push(...target.mergedFrom)
      } else {
        newItems.push(item)
      }
    }
    onUpdate(newItems)
  }

  return { update, updateAmount, toggleExclude, applyBulkCategory, mergeCategory, unmergeItem }
}
