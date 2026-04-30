import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/users'
import { updateCompany, updatePassword, getCompanyByEmail } from '@/lib/companies'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未認証' }, { status: 401 })
  }

  // 管理者アカウントはここから変更不可（env vars管理）
  if (isAdmin(session.user.email)) {
    return NextResponse.json({ error: '管理者アカウントはここから変更できません' }, { status: 403 })
  }

  const body = await req.json()
  const company = await getCompanyByEmail(session.user.email)
  if (!company) return NextResponse.json({ error: '企業が見つかりません' }, { status: 404 })

  if ('email' in body) {
    await updateCompany(company.id, company.name, body.email)
  } else if ('password' in body && 'currentPassword' in body) {
    const valid = await bcrypt.compare(body.currentPassword, company.password_hash)
    if (!valid) return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 400 })
    const newHash = await bcrypt.hash(body.password, 10)
    await updatePassword(company.id, newHash)
  }

  return NextResponse.json({ ok: true })
}
