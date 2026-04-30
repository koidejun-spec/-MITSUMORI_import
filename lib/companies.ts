import { supabase } from './supabase'

export interface Company {
  id: string
  name: string
  email: string
  password_hash: string
  is_active: boolean
  created_at: string
}

export interface CompanyWithUsage extends Company {
  total_extractions: number
  last_used_at: string | null
}

export async function getCompanyByEmail(email: string): Promise<Company | null> {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()
  return data
}

export async function logUsage(email: string, fileCount: number): Promise<void> {
  await supabase.from('usage_logs').insert({ email, file_count: fileCount })
}

export async function getCompaniesWithUsage(): Promise<CompanyWithUsage[]> {
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (!companies) return []

  const { data: logs } = await supabase
    .from('usage_logs')
    .select('email, file_count, created_at')

  return companies.map((company) => {
    const companyLogs = (logs ?? []).filter((l) => l.email === company.email)
    const total_extractions = companyLogs.reduce((sum, l) => sum + l.file_count, 0)
    const sorted = [...companyLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    return {
      ...company,
      total_extractions,
      last_used_at: sorted[0]?.created_at ?? null,
    }
  })
}
