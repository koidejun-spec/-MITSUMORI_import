import { RoundingMode, MarkupSettings } from './types'

export function applyRounding(value: number, mode: RoundingMode): number {
  switch (mode) {
    case 'floor': return Math.floor(value)
    case 'round': return Math.round(value)
    case 'ceil':  return Math.ceil(value)
    case 'trunc': return Math.trunc(value)
  }
}

export function getMarkupRate(category: string | null, settings: MarkupSettings): number {
  if (category && settings.categoryRates[category] != null) {
    return settings.categoryRates[category]
  }
  return settings.defaultRate
}

export function getMarginRate(category: string | null, settings: MarkupSettings): number {
  if (category && settings.categoryMargins[category] != null) {
    return settings.categoryMargins[category]
  }
  return settings.defaultMargin
}

/** 原価から売価を算出する（掛率 or 粗利率モードに対応） */
export function calcSellingPrice(
  costPrice: number,
  category: string | null,
  settings: MarkupSettings,
  mode: RoundingMode,
): number {
  if (settings.pricingMode === 'margin') {
    const margin = getMarginRate(category, settings)
    // 売価 = 原価 ÷ (1 - 粗利率/100)
    return applyRounding(costPrice / (1 - margin / 100), mode)
  }
  const rate = getMarkupRate(category, settings)
  return applyRounding(costPrice * rate, mode)
}

/** 原価合計と数量から原価単価を逆算する（小数点2桁・切り捨て） */
export function reverseCalcUnitPrice(amount: number, quantity: number): number {
  return Math.trunc((amount / quantity) * 100) / 100
}
