'use client'

import { useState } from 'react'

interface TextModalProps {
  label: string
  value: string
  onChange: (v: string) => void
  onClose: () => void
}

export default function TextModal({ label, value, onChange, onClose }: TextModalProps) {
  const [draft, setDraft] = useState(value)
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-5 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{label}</h3>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-2.5 py-2 resize-y min-h-[120px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 px-3 py-1.5 hover:bg-gray-100 rounded"
          >
            キャンセル
          </button>
          <button
            onClick={() => { onChange(draft); onClose() }}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
