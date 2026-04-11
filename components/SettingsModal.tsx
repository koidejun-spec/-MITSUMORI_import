'use client'

import { useState } from 'react'
import { RoundingMode, MarkupSettings } from '@/lib/types'

interface SettingsModalProps {
  roundingMode: RoundingMode
  onRoundingModeChange: (mode: RoundingMode) => void
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

export default function SettingsModal({
  roundingMode,
  onRoundingModeChange,
  markupSettings,
  onMarkupSettingsChange,
  onClose,
}: SettingsModalProps) {
  const [newCategory, setNewCategory] = useState('')
  const [newRate, setNewRate] = useState('')

  function updateDefaultRate(value: string) {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return
    onMarkupSettingsChange({ ...markupSettings, defaultRate: num })
  }

  function addCategoryRate() {
    const trimmed = newCategory.trim()
    const rate = parseFloat(newRate)
    if (!trimmed || isNaN(rate) || rate <= 0) return
    onMarkupSettingsChange({
      ...markupSettings,
      categoryRates: { ...markupSettings.categoryRates, [trimmed]: rate },
    })
    setNewCategory('')
    setNewRate('')
  }

  function removeCategoryRate(category: string) {
    const next = { ...markupSettings.categoryRates }
    delete next[category]
    onMarkupSettingsChange({ ...markupSettings, categoryRates: next })
  }

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

          {/* 掛率設定 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">掛率設定</p>
            <p className="text-xs text-gray-400 mb-3">原価に掛率を乗せて売値を自動計算します</p>

            {/* デフォルト掛率 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">デフォルト掛率（全工種共通）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  defaultValue={markupSettings.defaultRate}
                  onBlur={(e) => updateDefaultRate(e.target.value)}
                  className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-400">
                  例）1.2 → 原価の20%増し
                </span>
              </div>
            </div>

            {/* 工種別掛率 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">工種別掛率（上書き）</label>
              {Object.entries(markupSettings.categoryRates).length > 0 && (
                <div className="space-y-1 mb-2">
                  {Object.entries(markupSettings.categoryRates).map(([cat, rate]) => (
                    <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-700">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-600">{rate}掛</span>
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
                  placeholder="掛率"
                  step="0.01"
                  min="1"
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

          {/* 端数処理 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">端数処理ルール</p>
            <p className="text-xs text-gray-400 mb-3">単価を逆算する際（金額÷数量）の端数処理方法</p>
            <div className="space-y-2">
              {ROUNDING_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-colors
                    ${roundingMode === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="roundingMode"
                      value={opt.value}
                      checked={roundingMode === opt.value}
                      onChange={() => onRoundingModeChange(opt.value)}
                      className="accent-blue-600"
                    />
                    <span className={`text-sm font-medium ${roundingMode === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
                      {opt.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{opt.description}</span>
                </label>
              ))}
            </div>
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
