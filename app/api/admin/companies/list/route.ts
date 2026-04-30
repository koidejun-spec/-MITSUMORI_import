import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/users'
import { getCompaniesWithUsage } from '@/lib/companies'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const companies = await getCompaniesWithUsage()
  return NextResponse.json(companies)
}
