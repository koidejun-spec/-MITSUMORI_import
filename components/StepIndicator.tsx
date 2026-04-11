'use client'

type Step = 'upload' | 'processing' | 'review'

const steps = [
  { key: 'upload', label: 'アップロード', num: 1 },
  { key: 'processing', label: 'AI抽出', num: 2 },
  { key: 'review', label: '確認・ダウンロード', num: 3 },
]

export default function StepIndicator({ step }: { step: Step }) {
  const currentIndex = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((s, i) => {
        const isDone = i < currentIndex
        const isActive = i === currentIndex
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
              >
                {isDone ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 mb-4 mx-1 ${i < currentIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
