import bcrypt from 'bcryptjs'

interface StoredUser {
  email: string
  name: string
  passwordHash: string
}

function getUsers(): StoredUser[] {
  // 個別環境変数から読む（JSON不要）
  const email = process.env.AUTH_USER_EMAIL
  const name = process.env.AUTH_USER_NAME
  const passwordHash = process.env.AUTH_USER_HASH
  if (email && name && passwordHash) {
    return [{ email, name, passwordHash }]
  }

  // フォールバック: AUTH_USERS JSON
  try {
    return JSON.parse(process.env.AUTH_USERS || '[]') as StoredUser[]
  } catch {
    console.error('AUTH_USERS の解析に失敗しました')
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
