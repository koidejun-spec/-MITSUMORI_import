import { useState, useEffect, useCallback } from 'react'
import { EstimateItem, GlobalWarning, RoundingMode, ProfitBase, MarkupSettings } from '@/lib/types'
import { applyRounding, calcSellingPrice } from '@/lib/markup'
import { extractFromFiles } from '@/lib/api'
import { buildItems, buildWarnings, recalculateSellingPrices } from '@/lib/builder'
import { downloadCSV } from '@/lib/csv'
import { saveState, loadState, clearState } from '@/lib/storage'

const DEFAULT_MARKUP: MarkupSettings = {
  pricingMode: 'markup',
  defaultRate: 1.2,
  categoryRates: {},
  defaultMargin: 20,
  categoryMargins: {},
}

function loadMarkupSettings(): MarkupSettings {
  if (typeof window === 'undefined') return DEFAULT_MARKUP
  try {
    const data = localStorage.getItem('markupSettings')
    if (!data) return DEFAULT_MARKUP
    const parsed = JSON.parse(data)
    // 旧フォーマット互換: 新フィールドがなければデフォルトで補完
    return { ...DEFAULT_MARKUP, ...parsed }
  } catch {
    return DEFAULT_MARKUP
  }
}

interface FailedFile {
  fileName: string
  error: string
}

export type Step = 'upload' | 'processing' | 'review'

export function useEstimateFlow() {
  const [step, setStep] = useState<Step>('upload')
  const [items, setItems] = useState<EstimateItem[]>([])
  const [warnings, setWarnings] = useState<GlobalWarning[]>([])
  const [failedFiles, setFailedFiles] = useState<FailedFile[]>([])
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [processingMsg, setProcessingMsg] = useState('処理中...')
  const [downloaded, setDownloaded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [roundingMode, setRoundingMode] = useState<RoundingMode>(() => {
    if (typeof window === 'undefined') return 'floor'
    return (localStorage.getItem('roundingMode') as RoundingMode) || 'floor'
  })
  const [markupSettings, setMarkupSettings] = useState<MarkupSettings>(loadMarkupSettings)
  const [profitBase, setProfitBase] = useState<ProfitBase>(() => {
    if (typeof window === 'undefined') return 'tax_excluded'
    return (localStorage.getItem('profitBase') as ProfitBase) || 'tax_excluded'
  })

  // 掛率または端数処理が変わったら再計算
  useEffect(() => {
    setItems((prev) => {
      if (prev.length === 0) return prev
      return recalculateSellingPrices(prev, roundingMode, markupSettings)
    })
  }, [markupSettings, roundingMode])

  // Check for saved state on mount
  useEffect(() => {
    const saved = loadState()
    if (saved && saved.items.length > 0) {
      setSavedAt(saved.savedAt)
      setShowResumeDialog(true)
    }
  }, [])

  // Auto-save on changes
  useEffect(() => {
    if (items.length > 0) {
      saveState(items, warnings)
    }
  }, [items, warnings])

  const handleResume = useCallback(() => {
    const saved = loadState()
    if (saved) {
      setItems(saved.items)
      setWarnings(saved.warnings || [])
      setStep('review')
    }
    setShowResumeDialog(false)
  }, [])

  const handleDismissResume = useCallback(() => {
    clearState()
    setShowResumeDialog(false)
  }, [])

  const handleProcess = useCallback(async (files: File[]) => {
    setStep('processing')
    setProcessingMsg(`${files.length}件のファイルを処理中...`)

    try {
      const results = await extractFromFiles(files)
      const failed = results
        .filter((r) => r.status === 'error')
        .map((r) => ({ fileName: r.fileName, error: r.error || '不明なエラー' }))

      setFailedFiles(failed)
      setItems(buildItems(results, roundingMode, markupSettings))
      setWarnings(buildWarnings(results))
      setStep('review')
    } catch (err) {
      alert(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      setStep('upload')
    }
  }, [roundingMode, markupSettings])

  const handleWarningDecision = useCallback((id: string, decision: string) => {
    setWarnings((prev) =>
      prev.map((w) => (w.id === id ? { ...w, acknowledged: true, decision } : w)),
    )

    if (decision === 'divide_by_1.1') {
      const targetFileName = warnings.find((w) => w.id === id)?.sourceFileName
      setItems((prev) =>
        prev.map((item) => {
          if (targetFileName && item.sourceFileName !== targetFileName) return item
          const newCostPrice = item.costPrice != null ? applyRounding(item.costPrice / 1.1, roundingMode) : null
          const newSellingUnitPrice = item.sellingUnitPriceEdited
            ? item.sellingUnitPrice
            : (newCostPrice != null ? calcSellingPrice(newCostPrice, item.category, markupSettings, roundingMode) : null)
          return {
            ...item,
            costPrice: newCostPrice,
            amount: item.amount != null ? applyRounding(item.amount / 1.1, roundingMode) : null,
            sellingUnitPrice: newSellingUnitPrice,
          }
        }),
      )
    }
  }, [roundingMode, markupSettings, warnings])

  const handleDownload = useCallback(() => {
    const activeItems = items.filter((i) => !i.excluded)
    if (activeItems.length === 0) {
      alert('出力する行がありません。')
      return
    }

    const outputItems = activeItems

    const vendors = Array.from(new Set(activeItems.map((i) => i.vendorName).filter(Boolean)))
    const vendorPart = vendors.length === 0
      ? '見積取込'
      : vendors.length === 1
      ? vendors[0]
      : `${vendors[0]}他${vendors.length - 1}社`
    const today = new Date()
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const filename = `${vendorPart}_${datePart}.csv`

    downloadCSV(outputItems, profitBase, filename)
    setDownloaded(true)
  }, [items, profitBase])

  const handleReset = useCallback(() => {
    if (confirm('新しいファイルを処理しますか？現在のデータは消去されます。')) {
      setItems([])
      setWarnings([])
      setFailedFiles([])
      setDownloaded(false)
      clearState()
      setStep('upload')
    }
  }, [])

  const handleProfitBaseChange = useCallback((base: ProfitBase) => {
    setProfitBase(base)
    localStorage.setItem('profitBase', base)
  }, [])

  const handleRoundingModeChange = useCallback((mode: RoundingMode) => {
    setRoundingMode(mode)
    localStorage.setItem('roundingMode', mode)
  }, [])

  const handleMarkupSettingsChange = useCallback((settings: MarkupSettings) => {
    setMarkupSettings(settings)
    localStorage.setItem('markupSettings', JSON.stringify(settings))
  }, [])

  const pendingWarnings = warnings.filter((w) => !w.acknowledged)
  const activeCount = items.filter((i) => !i.excluded).length

  return {
    step,
    items,
    setItems,
    failedFiles,
    showResumeDialog,
    savedAt,
    processingMsg,
    downloaded,
    showSettings,
    setShowSettings,
    roundingMode,
    markupSettings,
    pendingWarnings,
    activeCount,
    handleResume,
    handleDismissResume,
    handleProcess,
    handleWarningDecision,
    handleDownload,
    handleReset,
    profitBase,
    handleProfitBaseChange,
    handleRoundingModeChange,
    handleMarkupSettingsChange,
  }
}
