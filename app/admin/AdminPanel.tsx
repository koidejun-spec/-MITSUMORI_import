'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CompanyWithUsage } from '@/lib/companies'

type Modal =
  | { type: 'add' }
  | { type: 'edit'; company: CompanyWithUsage }
  | { type: 'password'; company: CompanyWithUsage }
  | { type: 'delete'; company: CompanyWithUsage }
  | null

export default function AdminPanel({ initialCompanies }: { initialCompanies: CompanyWithUsage[] }) {
  const [companies, setCompanies] = useState(initialCompanies)
  const [modal, setModal] = useState<Modal>(null)
  const [loading, setLoading] = useState(false)

  async function reload() {
    const res = await fetch('/api/admin/companies/list')
    const data = await res.json()
    setCompanies(data)
  }

  async function handleAdd(name: string, email: string, password: string) {
    setLoading(true)
    await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    await reload()
    setModal(null)
    setLoading(false)
  }

  async function handleEdit(id: string, name: string, email: string) {
    setLoading(true)
    await fetch(`/api/admin/companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    await reload()
    setModal(null)
    setLoading(false)
  }

  async function handlePassword(id: string, password: string) {
    setLoading(true)
    await fetch(`/api/admin/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setModal(null)
    setLoading(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/admin/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    await reload()
  }

  async function handleDelete(id: string) {
    setLoading(true)
    await fetch(`/api/admin/companies/${id}`, { method: 'DELETE' })
    await reload()
    setModal(null)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-800">利用企業ダッシュボード</h1>
          <button
            onClick={() => setModal({ type: 'add' })}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            ＋ 企業追加
          </button>
        </div>

        {companies.length === 0 ? (
          <p className="text-slate-500 text-sm">登録企業はありません</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-teal-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white">会社名</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white">メール</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-white">抽出件数</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white">最終利用</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white">状態</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{company.name}</td>
                    <td className="px-6 py-4 text-slate-500">{company.email}</td>
                    <td className="px-6 py-4 text-right text-slate-800">{company.total_extractions}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {company.last_used_at
                        ? formatDistanceToNow(new Date(company.last_used_at), { addSuffix: true, locale: ja })
                        : '未使用'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(company.id, !company.is_active)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          company.is_active
                            ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {company.is_active ? '有効' : '無効'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModal({ type: 'edit', company })}
                          className="text-xs text-teal-600 hover:underline"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setModal({ type: 'password', company })}
                          className="text-xs text-orange-600 hover:underline"
                        >
                          PW変更
                        </button>
                        <button
                          onClick={() => setModal({ type: 'delete', company })}
                          className="text-xs text-red-600 hover:underline"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            {modal.type === 'add' && (
              <CompanyForm
                title="企業追加"
                onSubmit={(name, email, password) => handleAdd(name, email, password!)}
                onCancel={() => setModal(null)}
                loading={loading}
                showPassword
              />
            )}
            {modal.type === 'edit' && (
              <CompanyForm
                title="企業編集"
                defaultName={modal.company.name}
                defaultEmail={modal.company.email}
                onSubmit={(name, email) => handleEdit(modal.company.id, name, email)}
                onCancel={() => setModal(null)}
                loading={loading}
              />
            )}
            {modal.type === 'password' && (
              <PasswordForm
                company={modal.company}
                onSubmit={(password) => handlePassword(modal.company.id, password)}
                onCancel={() => setModal(null)}
                loading={loading}
              />
            )}
            {modal.type === 'delete' && (
              <DeleteConfirm
                company={modal.company}
                onConfirm={() => handleDelete(modal.company.id)}
                onCancel={() => setModal(null)}
                loading={loading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CompanyForm({
  title, defaultName = '', defaultEmail = '', onSubmit, onCancel, loading, showPassword = false,
}: {
  title: string
  defaultName?: string
  defaultEmail?: string
  onSubmit: (name: string, email: string, password?: string) => void
  onCancel: () => void
  loading: boolean
  showPassword?: boolean
}) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')

  return (
    <>
      <h2 className="text-base font-bold text-slate-800 mb-4">{title}</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">会社名</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">メールアドレス</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        {showPassword && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">パスワード</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onCancel} className="flex-1 border border-slate-200 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50">キャンセル</button>
        <button onClick={() => onSubmit(name, email, password)} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm py-2 rounded-lg disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
          {loading ? '処理中...' : '保存'}
        </button>
      </div>
    </>
  )
}

function PasswordForm({ company, onSubmit, onCancel, loading }: {
  company: CompanyWithUsage
  onSubmit: (password: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [password, setPassword] = useState('')
  return (
    <>
      <h2 className="text-base font-bold text-slate-800 mb-1">パスワードリセット</h2>
      <p className="text-xs text-slate-500 mb-4">{company.name}</p>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">新しいパスワード</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onCancel} className="flex-1 border border-slate-200 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50">キャンセル</button>
        <button onClick={() => onSubmit(password)} disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm py-2 rounded-lg disabled:bg-slate-200 transition-colors">
          {loading ? '処理中...' : '変更'}
        </button>
      </div>
    </>
  )
}

function DeleteConfirm({ company, onConfirm, onCancel, loading }: {
  company: CompanyWithUsage
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <>
      <h2 className="text-base font-bold text-slate-800 mb-2">企業削除</h2>
      <p className="text-sm text-slate-600 mb-4">「{company.name}」を削除しますか？この操作は取り消せません。</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 border border-slate-200 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50">キャンセル</button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg disabled:bg-slate-200 transition-colors">
          {loading ? '削除中...' : '削除'}
        </button>
      </div>
    </>
  )
}
