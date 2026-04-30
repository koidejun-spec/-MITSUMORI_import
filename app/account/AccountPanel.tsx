'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export default function AccountPanel({ name, email }: { name: string; email: string }) {
  const [tab, setTab] = useState<'info' | 'password'>('info')
  const [newEmail, setNewEmail] = useState(email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleEmailSave() {
    if (newEmail === email) return
    setLoading(true)
    setMessage(null)
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail }),
    })
    setLoading(false)
    if (res.ok) {
      setMessage({ type: 'ok', text: 'メールアドレスを更新しました。再ログインしてください。' })
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2000)
    } else {
      const d = await res.json()
      setMessage({ type: 'err', text: d.error ?? '更新に失敗しました' })
    }
  }

  async function handlePasswordSave() {
    if (!currentPassword || !newPassword) return
    setLoading(true)
    setMessage(null)
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, password: newPassword }),
    })
    setLoading(false)
    if (res.ok) {
      setMessage({ type: 'ok', text: 'パスワードを変更しました。' })
      setCurrentPassword('')
      setNewPassword('')
    } else {
      const d = await res.json()
      setMessage({ type: 'err', text: d.error ?? '変更に失敗しました' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">アカウント設定</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setTab('info'); setMessage(null) }}
              className={`flex-1 py-3 text-sm font-medium ${tab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              アカウント情報
            </button>
            <button
              onClick={() => { setTab('password'); setMessage(null) }}
              className={`flex-1 py-3 text-sm font-medium ${tab === 'password' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              パスワード変更
            </button>
          </div>

          <div className="p-6 space-y-4">
            {tab === 'info' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">会社名</label>
                  <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-lg">{name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">メールアドレス</label>
                  <input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                {message && (
                  <p className={`text-xs ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.text}
                  </p>
                )}
                <button
                  onClick={handleEmailSave}
                  disabled={loading || newEmail === email}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg disabled:bg-gray-300"
                >
                  {loading ? '保存中...' : '変更を保存'}
                </button>
              </>
            )}

            {tab === 'password' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">現在のパスワード</label>
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">新しいパスワード</label>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                {message && (
                  <p className={`text-xs ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.text}
                  </p>
                )}
                <button
                  onClick={handlePasswordSave}
                  disabled={loading || !currentPassword || !newPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg disabled:bg-gray-300"
                >
                  {loading ? '変更中...' : 'パスワードを変更'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">← ツールに戻る</a>
        </div>
      </div>
    </div>
  )
}
