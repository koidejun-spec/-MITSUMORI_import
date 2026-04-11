export type RoundingMode = 'floor' | 'round' | 'ceil' | 'trunc'

export interface MarkupSettings {
  defaultRate: number                  // デフォルト掛率（例：1.2）
  categoryRates: Record<string, number> // 工種別上書き（例：{"電気工事": 1.3}）
}

export interface EstimateItem {
  id: string
  sourceFileName: string
  sourcePage: number
  sourceText: string
  vendorName: string
  category: string | null
  itemName: string
  specification: string
  quantity: number | null
  unit: string
  unitPrice: number | null
  amount: number | null
  costPrice: number | null
  sellingUnitPrice: number | null      // 売値単価（原価 × 掛率）
  sellingUnitPriceEdited: boolean      // 売値単価を手動編集したか
  remarks: string
  confidence: 'high' | 'medium' | 'low'
  reviewStatus: 'ok' | 'warning' | 'error'
  warnings: string[]
  excluded: boolean
}

export interface TaxWarningData {
  sourceFileName: string
}

export interface TotalMismatchData {
  vendorTotal: number
  extractedTotal: number
  difference: number
}

export interface GlobalWarning {
  id: string
  type: 'tax' | 'total_mismatch'
  sourceFileName: string
  data: TaxWarningData | TotalMismatchData
  acknowledged: boolean
  decision?: string
}

export interface ClaudeExtractedItem {
  category: string | null
  itemName: string
  specification: string
  quantity: number | null
  unit: string
  unitPrice: number | null
  amount: number | null
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
}

export interface ExtractionResponse {
  vendorName: string
  totalAmount: number | null
  hasTaxIncluded: boolean
  items: ClaudeExtractedItem[]
}

export interface ProcessingResult {
  fileName: string
  status: 'success' | 'error'
  error?: string
  vendorName?: string
  totalAmount?: number | null
  hasTaxIncluded?: boolean
  items?: ClaudeExtractedItem[]
  availableSheets?: string[]
  selectedSheet?: string
}

export interface SavedState {
  items: EstimateItem[]
  warnings: GlobalWarning[]
  savedAt: number
}
