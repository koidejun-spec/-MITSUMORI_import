import bcrypt from 'bcryptjs'
import { getCompanyByEmail } from './companies'

function getAdminUser(): { email: string; name: string; passwordHash: string } | null {
  const email = process.env.AUTH_USER_EMAIL
  const name = process.env.AUTH_USER_NAME
  const passwordHash = process.env.AUTH_USER_HASH
  if (email && name && passwordHash) return { email, name, passwordHash }
  return null
}

export function isAdmin(email: string): boolean {
  return email === process.env.AUTH_USER_EMAIL
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ email: string; name: string } | null> {
  // 管理者（env vars）
  const admin = getAdminUser()
  if (admin && admin.email === email) {
    const valid = await bcrypt.compare(password, admin.passwordHash)
    return valid ? { email: admin.email, name: admin.name } : null
  }

  // 利用企業（Supabase）
  console.log('[auth] Supabase lookup for:', email)
  const company = await getCompanyByEmail(email)
  console.log('[auth] company found:', !!company)
  if (!company) return null
  const valid = await bcrypt.compare(password, company.password_hash)
  return valid ? { email: company.email, name: company.name } : null
}
