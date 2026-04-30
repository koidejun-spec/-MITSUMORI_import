import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/users'
import { updateCompany, deleteCompany, toggleCompanyStatus, updatePassword } from '@/lib/companies'
import bcrypt from 'bcryptjs'

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session.user.email)) return false
  return true
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { name, email } = await req.json()
  await updateCompany(params.id, name, email)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  await deleteCompany(params.id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const body = await req.json()

  if ('is_active' in body) {
    await toggleCompanyStatus(params.id, body.is_active)
  } else if ('password' in body) {
    const passwordHash = await bcrypt.hash(body.password, 10)
    await updatePassword(params.id, passwordHash)
  }

  return NextResponse.json({ ok: true })
}
