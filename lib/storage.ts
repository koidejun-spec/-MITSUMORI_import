import { EstimateItem, GlobalWarning, SavedState } from './types'

const STORAGE_KEY = 'estimate-tool-state'

export function saveState(items: EstimateItem[], warnings: GlobalWarning[]): void {
  if (typeof window === 'undefined') return
  try {
    const state: SavedState = { items, warnings, savedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

export function loadState(): SavedState | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    const state = JSON.parse(data) as SavedState
    // Discard data older than 24 hours
    if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
      clearState()
      return null
    }
    // フィールド追加前のデータとの互換性を保つため undefined をデフォルト値で補完
    state.items = state.items.map((item) => ({
      ...item,
      sellingUnitPriceEdited: item.sellingUnitPriceEdited ?? false,
      excluded: item.excluded ?? false,
    }))
    return state
  } catch {
    return null
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
