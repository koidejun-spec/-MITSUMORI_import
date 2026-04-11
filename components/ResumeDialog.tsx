interface ResumeDialogProps {
  savedAt: number | null
  onResume: () => void
  onDismiss: () => void
}

export default function ResumeDialog({ savedAt, onResume, onDismiss }: ResumeDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="text-3xl text-center mb-3">💾</div>
        <h2 className="text-lg font-bold text-gray-800 text-center mb-2">前回の作業を再開しますか？</h2>
        <p className="text-sm text-gray-500 text-center mb-1">
          前回の作業データが保存されています。
        </p>
        {savedAt && (
          <p className="text-xs text-gray-400 text-center mb-5">
            保存日時: {new Date(savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onResume}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            再開する
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
          >
            新規開始
          </button>
        </div>
      </div>
    </div>
  )
}
