'use client'

import { useRef, useState } from 'react'

interface FileUploadProps {
  onProcess: (files: File[]) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
]

const ACCEPTED_EXT = ['.pdf', '.xlsx', '.xls', '.jpg', '.jpeg', '.png']

export default function FileUpload({ onProcess }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const newFiles = Array.from(incoming).filter((f) => {
      const name = f.name.toLowerCase()
      return ACCEPTED_EXT.some((ext) => name.endsWith(ext)) || ACCEPTED_TYPES.includes(f.type)
    })
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...newFiles.filter((f) => !existing.has(f.name + f.size))]
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(file: File): string {
    const name = file.name.toLowerCase()
    if (name.endsWith('.pdf')) return '📄'
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📊'
    return '🖼️'
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-slate-50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="text-5xl mb-3">📁</div>
        <p className="text-lg font-semibold text-slate-700 mb-1">
          ファイルをドロップ、またはクリックして選択
        </p>
        <p className="text-sm text-slate-400">
          PDF・Excel（.xlsx/.xls）・画像（JPG・PNG）に対応
        </p>
        <p className="text-xs text-slate-400 mt-1">複数ファイルを同時にアップロード可能</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={ACCEPTED_EXT.join(',')}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
              <span className="text-2xl">{getFileIcon(file)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                aria-label="削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <button
            onClick={() => onProcess(files)}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-base"
          >
            AI で読み取る（{files.length}件）
          </button>
        </div>
      )}
    </div>
  )
}
