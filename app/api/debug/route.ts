import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    AUTH_USER_EMAIL: process.env.AUTH_USER_EMAIL || 'not set',
    AUTH_USER_NAME: process.env.AUTH_USER_NAME || 'not set',
    AUTH_USER_HASH_exists: !!process.env.AUTH_USER_HASH,
    AUTH_USER_HASH_length: (process.env.AUTH_USER_HASH || '').length,
    has_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    has_NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_value: process.env.NEXTAUTH_URL || 'not set',
  })
}
