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

/** 原価合計と数量から原価単価を逆算する（小数点2桁・切り捨て） */
export function reverseCalcUnitPrice(amount: number, quantity: number): number {
  return Math.trunc((amount / quantity) * 100) / 100
}
