import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com a chave service_role — SOMENTE no servidor (route handlers).
 * Nunca importe este arquivo em componentes 'use client'.
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env.local.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (ou URL) não configurada no .env.local')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
