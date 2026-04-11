'use client'

import { useState } from 'react'
import { RoundingMode, ProfitBase, PricingMode, MarkupSettings } from '@/lib/types'

interface SettingsModalProps {
  roundingMode: RoundingMode
  onRoundingModeChange: (mode: RoundingMode) => void
  profitBase: ProfitBase
  onProfitBaseChange: (base: ProfitBase) => void
  markupSettings: MarkupSettings
  onMarkupSettingsChange: (settings: MarkupSettings) => void
  onClose: () => void
}

const ROUNDING_OPTIONS: { value: RoundingMode; label: string; description: string }[] = [
  { value: 'round', label: '四捨五入', description: '666.6 → 667' },
  { value: 'floor', label: '切り捨て', description: '666.6 → 666' },
  { value: 'ceil',  label: '切り上げ', description: '666.1 → 667' },
  { value: 'trunc', label: '端数除去', description: '666.9 → 666' },
]

const PROFIT_BASE_OPTIONS: { value: ProfitBase; label: string; description: string }[] = [
  { value: 'tax_excluded', label: '税抜売価ベース（推奨）', description: '粗利 = 税抜売価 − 税抜原価' },
  { value: 'tax_included', label: '税込売価ベース', description: '粗利 = 税込売価 − 税抜原価' },
]

const PRICING_MODE_OPTIONS: { value: PricingMode; label: string; description: string }[] = [
  { value: 'markup', label: '掛率', description: '原価 × 掛率 = 売価' },
  { value: 'margin', label: '粗利率', description: '原価 ÷ (1 − 粗利率) = 売価' },
]

export default function SettingsModal({
  roundingMode,
  onRoundingModeChange,
  profitBase,
  onProfitBaseChange,
  markupSettings,
  onMarkupSettingsChange,
  onClose,
}: SettingsModalProps) {
  const [newCategory, setNewCategory] = useState('')
  const [newRate, setNewRate] = useState('')

  const isMarkup = markupSettings.pricingMode === 'markup'

  function handlePricingModeChange(mode: PricingMode) {
    onMarkupSettingsChange({ ...markupSettings, pricingMode: mode })
  }

  function updateDefaultRate(value: string) {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return
    onMarkupSettingsChange({ ...markupSettings, defaultRate: num })
  }

  function updateDefaultMargin(value: string) {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0 || num >= 100) return
    onMarkupSettingsChange({ ...markupSettings, defaultMargin: num })
  }

  function addCategoryRate() {
    const trimmed = newCategory.trim()
    const rate = parseFloat(newRate)
    if (!trimmed) return

    if (isMarkup) {
      if (isNaN(rate) || rate <= 0) return
      onMarkupSettingsChange({
        ...markupSettings,
        categoryRates: { ...markupSettings.categoryRates, [trimmed]: rate },
      })
    } else {
      if (isNaN(rate) || rate <= 0 || rate >= 100) return
      onMarkupSettingsChange({
        ...markupSettings,
        categoryMargins: { ...markupSettings.categoryMargins, [trimmed]: rate },
      })
    }
    setNewCategory('')
    setNewRate('')
  }

  function removeCategoryRate(category: string) {
    if (isMarkup) {
      const next = { ...markupSettings.categoryRates }
      delete next[category]
      onMarkupSettingsChange({ ...markupSettings, categoryRates: next })
    } else {
      const next = { ...markupSettings.categoryMargins }
      delete next[category]
      onMarkupSettingsChange({ ...markupSettings, categoryMargins: next })
    }
  }

  // 現在のモードに応じた工種別設定を取得
  const categoryEntries = isMarkup
    ? Object.entries(markupSettings.categoryRates)
    : Object.entries(markupSettings.categoryMargins)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">設定</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* 売価計算方式 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">売価計算方式</p>
            <p className="text-xs text-gray-400 mb-3">原価から売価を算出する方法を選択</p>
            <div className="flex gap-2 mb-4">
              {PRICING_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePricingModeChange(opt.value)}
                  className={`flex-1 text-center py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    markupSettings.pricingMode === opt.value
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              {isMarkup
                ? '例）掛率1.2 → 原価10万 × 1.2 = 売価12万（粗利率16.7%）'
                : '例）粗利率20% → 原価10万 ÷ 0.8 = 売価12.5万（粗利率20%）'}
            </p>
          </div>

          {/* 区切り */}
          <div className="border-t border-gray-100" />

          {/* 掛率 or 粗利率の設定 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {isMarkup ? '掛率設定' : '粗利率設定'}
            </p>
            <p className="text-xs text-gray-400 mb-3">
              {isMarkup
                ? '原価に掛率を乗せて売値を自動計算します'
                : '目標粗利率から売値を自動計算します'}
            </p>

            {/* デフォルト値 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {isMarkup ? 'デフォルト掛率（全工種共通）' : 'デフォルト粗利率（全工種共通）'}
              </label>
              <div className="flex items-center gap-2">
                {isMarkup ? (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      defaultValue={markupSettings.defaultRate}
                      onBlur={(e) => updateDefaultRate(e.target.value)}
                      key="markup-default"
                      className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-xs text-gray-400">
                      例）1.2 → 原価の20%増し
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="99.9"
                      defaultValue={markupSettings.defaultMargin}
                      onBlur={(e) => updateDefaultMargin(e.target.value)}
                      key="margin-default"
                      className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-xs text-gray-400">
                      %（例：20 → 粗利率20%）
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 工種別設定 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                {isMarkup ? '工種別掛率（上書き）' : '工種別粗利率（上書き）'}
              </label>
              {categoryEntries.length > 0 && (
                <div className="space-y-1 mb-2">
                  {categoryEntries.map(([cat, rate]) => (
                    <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-700">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-600">
                          {isMarkup ? `${rate}掛` : `${rate}%`}
                        </span>
                        <button
                          onClick={() => removeCategoryRate(cat)}
                          className="text-gray-300 hover:text-red-400 text-sm"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="工種名"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  type="number"
                  placeholder={isMarkup ? '掛率' : '%'}
                  step={isMarkup ? '0.01' : '0.1'}
                  min={isMarkup ? '1' : '0.1'}
                  max={isMarkup ? undefined : '99.9'}
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategoryRate()}
                  className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={addCategoryRate}
                  className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                >追加</button>
              </div>
            </div>
          </div>

          {/* 区切り */}
          <div className="border-t border-gray-100" />

          {/* 粗利計算基準 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">粗利計算基準</p>
            <p className="text-xs text-gray-400 mb-3">粗利率の算出に使用する売価の基準</p>
            <select
              value={profitBase}
              onChange={(e) => onProfitBaseChange(e.target.value as ProfitBase)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              {PROFIT_BASE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2">
              {profitBase === 'tax_excluded'
                ? '例：売価300,000円（税抜）− 原価220,000円 = 粗利80,000円（26.7%）'
                : '例：売価330,000円（税込）− 原価220,000円 = 粗利110,000円（33.3%）'}
            </p>
          </div>

          {/* 区切り */}
          <div className="border-t border-gray-100" />

          {/* 端数処理 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">端数処理ルール</p>
            <p className="text-xs text-gray-400 mb-3">単価を逆算する際（金額÷数量）の端数処理方法</p>
            <select
              value={roundingMode}
              onChange={(e) => onRoundingModeChange(e.target.value as RoundingMode)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              {ROUNDING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}（{opt.description}）
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
