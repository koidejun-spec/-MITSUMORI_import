import { NextResponse } from 'next/server'

export async function GET() {
  const raw = process.env.AUTH_USERS || ''
  let parsed: unknown[] = []
  let parseError = ''

  try {
    parsed = JSON.parse(raw || '[]')
  } catch (e) {
    parseError = String(e)
  }

  return NextResponse.json({
    AUTH_USERS_exists: !!process.env.AUTH_USERS,
    AUTH_USERS_length: raw.length,
    AUTH_USERS_first20: raw.substring(0, 20),
    AUTH_USERS_last20: raw.substring(raw.length - 20),
    parsed_count: parsed.length,
    parse_error: parseError,
    has_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    has_NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_value: process.env.NEXTAUTH_URL || 'not set',
  })
}
