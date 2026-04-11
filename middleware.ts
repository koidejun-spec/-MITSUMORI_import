import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER
  const password = process.env.BASIC_AUTH_PASSWORD

  // 認証情報が未設定の場合はスルー（ローカル開発で未設定時の安全策）
  if (!user || !password) {
    return NextResponse.next()
  }

  const authHeader = req.headers.get('authorization')

  if (authHeader) {
    const base64 = authHeader.replace('Basic ', '')
    const decoded = Buffer.from(base64, 'base64').toString('utf-8')
    const [inputUser, inputPassword] = decoded.split(':')

    if (inputUser === user && inputPassword === password) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Mitsumori Tool"',
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
