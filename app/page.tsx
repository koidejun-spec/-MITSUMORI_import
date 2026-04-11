'use client'

import { useEstimateFlow } from '@/hooks/useEstimateFlow'
import StepIndicator from '@/components/StepIndicator'
import FileUpload from '@/components/FileUpload'
import ReviewTable from '@/components/ReviewTable'
import WarningBanner from '@/components/WarningBanner'
import SettingsModal from '@/components/SettingsModal'
import ResumeDialog from '@/components/ResumeDialog'

export default function Home() {
  const {
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
    handleRoundingModeChange,
    handleMarkupSettingsChange,
  } = useEstimateFlow()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">見積取込ツール</h1>
            <p className="text-xs text-gray-400">協力業者見積 → DRM取込用CSV</p>
          </div>
          <div className="flex items-center gap-2">
            {step === 'review' && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                最初からやり直す
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="設定"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <StepIndicator step={step} />

        {showSettings && (
          <SettingsModal
            roundingMode={roundingMode}
            onRoundingModeChange={handleRoundingModeChange}
            markupSettings={markupSettings}
            onMarkupSettingsChange={handleMarkupSettingsChange}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showResumeDialog && (
          <ResumeDialog
            savedAt={savedAt}
            onResume={handleResume}
            onDismiss={handleDismissResume}
          />
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-2">見積書をアップロード</h2>
              <p className="text-gray-500 text-sm">PDF・Excel・画像に対応。複数ファイル同時処理可能です。</p>
            </div>
            <FileUpload onProcess={handleProcess} />
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">AIが読み取り中...</h2>
            <p className="text-sm text-gray-400">{processingMsg}</p>
            <p className="text-xs text-gray-300 mt-2">PDFや画像は少し時間がかかります</p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2">
              <span className="text-blue-500 text-lg">🤖</span>
              <p className="text-blue-800 text-sm font-medium">
                AIの候補です。内容を確認してOKしてください。必要に応じて編集できます。
              </p>
            </div>

            {failedFiles.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-700 text-sm font-semibold mb-1">以下のファイルは読み取れませんでした：</p>
                {failedFiles.map((f, i) => (
                  <p key={i} className="text-red-600 text-xs">
                    • {f.fileName}：{f.error}
                  </p>
                ))}
              </div>
            )}

            {pendingWarnings.map((w) => (
              <WarningBanner key={w.id} warning={w} onDecision={handleWarningDecision} />
            ))}

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p>抽出できた項目がありませんでした。</p>
              </div>
            ) : (
              <>
                <ReviewTable items={items} onUpdate={setItems} roundingMode={roundingMode} markupSettings={markupSettings} />

                <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
                  <p className="text-sm text-gray-500 mb-4">
                    確認済み：<span className="font-bold text-gray-800">{activeCount}件</span>
                    （全{items.length}件中、除外{items.length - activeCount}件）
                  </p>
                  <button
                    onClick={handleDownload}
                    disabled={activeCount === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 px-8 rounded-xl transition-colors text-base shadow-sm"
                  >
                    CSVをダウンロード（{activeCount}件）
                  </button>
                  {downloaded && (
                    <div className="mt-4 flex flex-col items-center gap-3">
                      <p className="text-sm text-green-600 font-medium">ダウンロード完了しました。再ダウンロードも可能です。</p>
                      <button
                        onClick={handleReset}
                        className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-4 py-2 rounded-lg transition-colors"
                      >
                        新しいファイルを処理する
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    DRM取込用CSV（BOM付きUTF-8）を出力します。
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
