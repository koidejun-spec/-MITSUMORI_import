import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

interface StoredUser {
  email: string
  name: string
  passwordHash: string
}

function getUsers(): StoredUser[] {
  try {
    const filePath = path.join(process.cwd(), 'users.json')
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as StoredUser[]
  } catch {
    console.error('users.json の読み込みに失敗しました')
    return []
  }
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ email: string; name: string } | null> {
  const users = getUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return null

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  return { email: user.email, name: user.name }
}
