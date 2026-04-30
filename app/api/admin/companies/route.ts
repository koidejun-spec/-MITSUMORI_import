import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/users'
import { createCompany } from '@/lib/companies'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { name, email, password } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await createCompany(name, email, passwordHash)
  return NextResponse.json({ ok: true })
}
