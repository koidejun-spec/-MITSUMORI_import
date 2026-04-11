'use client'

import { useState } from 'react'
import { GlobalWarning, TotalMismatchData } from '@/lib/types'

function formatMoney(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`
}

interface WarningBannerProps {
  warning: GlobalWarning
  onDecision: (id: string, decision: string) => void
}

export default function WarningBanner({ warning, onDecision }: WarningBannerProps) {
  const [selected, setSelected] = useState<string>('as_is')

  if (warning.acknowledged) {
    if (warning.type === 'tax' && warning.decision === 'divide_by_1.1') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-3 flex items-center gap-2 text-sm text-green-700">
          <span>✓</span>
          <span>税込処理済み（÷1.1を適用）：{warning.sourceFileName}</span>
        </div>
      )
    }
    return null
  }

  if (warning.type === 'tax') {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 mb-2">
              税込価格の可能性があります（{warning.sourceFileName}）
            </p>
            <div className="space-y-1 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`tax-${warning.id}`}
                  value="as_is"
                  checked={selected === 'as_is'}
                  onChange={() => setSelected('as_is')}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">税別として取り込む（そのまま）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`tax-${warning.id}`}
                  value="divide_by_1.1"
                  checked={selected === 'divide_by_1.1'}
                  onChange={() => setSelected('divide_by_1.1')}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">税込として取り込む（÷1.1で処理）</span>
              </label>
            </div>
            <button
              onClick={() => onDecision(warning.id, selected)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
            >
              決定
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (warning.type === 'total_mismatch') {
    const data = warning.data as TotalMismatchData
    const diff = data.vendorTotal - data.extractedTotal
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-red-800 mb-2">
              金額に差異があります（{warning.sourceFileName}）
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm mb-3 bg-white rounded p-2 border border-red-100">
              <div>
                <p className="text-gray-500 text-xs">業者総額</p>
                <p className="font-medium text-gray-800">{formatMoney(data.vendorTotal)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">抽出合計</p>
                <p className="font-medium text-gray-800">{formatMoney(data.extractedTotal)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">差額</p>
                <p className={`font-medium ${diff !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {diff > 0 ? '+' : ''}{formatMoney(diff)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onDecision(warning.id, 'confirm')}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
              >
                確認して続ける
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
