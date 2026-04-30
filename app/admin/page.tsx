import { getCompaniesWithUsage } from '@/lib/companies'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function AdminPage() {
  const companies = await getCompaniesWithUsage()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">利用企業ダッシュボード</h1>

        {companies.length === 0 ? (
          <p className="text-gray-500 text-sm">登録企業はありません</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">会社名</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">メール</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">抽出件数</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">最終利用</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                    <td className="px-6 py-4 text-gray-500">{company.email}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{company.total_extractions}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {company.last_used_at
                        ? formatDistanceToNow(new Date(company.last_used_at), {
                            addSuffix: true,
                            locale: ja,
                          })
                        : '未使用'}
                    </td>
                    <td className="px-6 py-4">
                      {company.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          有効
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          無効
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
