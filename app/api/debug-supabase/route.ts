import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  const { data, error } = await supabase.from('companies').select('email, name, password_hash')

  return NextResponse.json({
    url_set: !!url,
    key_set: !!key,
    key_prefix: key?.substring(0, 10),
    data,
    error: error?.message,
    error_code: error?.code,
  })
}
