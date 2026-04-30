import { getCompaniesWithUsage } from '@/lib/companies'
import AdminPanel from './AdminPanel'

export default async function AdminPage() {
  const companies = await getCompaniesWithUsage()
  return <AdminPanel initialCompanies={companies} />
}
