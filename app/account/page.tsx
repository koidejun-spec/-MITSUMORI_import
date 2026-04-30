import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCompanyByEmail } from '@/lib/companies'
import { isAdmin } from '@/lib/users'
import AccountPanel from './AccountPanel'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')
  if (isAdmin(session.user.email)) redirect('/')

  const company = await getCompanyByEmail(session.user.email)
  if (!company) redirect('/')

  return <AccountPanel name={company.name} email={company.email} />
}
