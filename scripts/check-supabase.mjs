/**
 * Verifica a conexão e o estado do banco Supabase do Deliver.
 *
 *   node scripts/check-supabase.mjs
 *
 * Lê as variáveis do .env.local, então não precisa passar nada na mão.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

async function loadEnv() {
  const raw = await readFile(path.join(root, '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return env
}

const env = await loadEnv()
const base = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const secret = env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!base || !anon) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local')
  process.exit(1)
}

console.log('URL         :', base)
console.log('anon key    :', anon.slice(0, 14) + '… (' + anon.length + ' chars)')
console.log('service key :', secret ? secret.slice(0, 10) + '… (' + secret.length + ' chars)' : 'AUSENTE')

const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}` })

const TABLES = [
  'agencies', 'clients', 'projects', 'videos',
  'revisions', 'demands', 'agency_members', 'admin_users', 'admin_logs',
]

async function rest(pathname, key, init = {}) {
  const res = await fetch(base + pathname, {
    ...init,
    headers: { ...headers(key), ...(init.headers || {}) },
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, ok: res.ok, body }
}

async function main() {
  const health = await fetch(base + '/auth/v1/health').catch(e => ({ status: 'ERR ' + e.message }))
  console.log('\n[auth health]', health.status)

  for (const [label, key] of [['anon', anon], ['secret', secret]]) {
    if (!key) continue
    console.log(`\n=== tabelas como ${label} ===`)
    for (const table of TABLES) {
      const r = await rest(`/rest/v1/${table}?select=*&limit=1`, key)
      let info
      if (r.ok) info = `OK  linhas visíveis: ${Array.isArray(r.body) ? r.body.length : '?'}`
      else {
        const b = r.body || {}
        info = `${b.code || r.status} ${String(b.message || '').slice(0, 70)}`
      }
      console.log(String(r.status).padEnd(4), table.padEnd(15), info)
    }
  }

  console.log('\n=== funções (RPC) ===')
  const rpcCalls = [
    ['get_client_portal', { p_agency_slug: 'nao-existe', p_client_slug: 'nao-existe' }],
    ['create_revision', { p_agency_slug: 'nao-existe', p_client_slug: 'nao-existe', p_video_id: '00000000-0000-0000-0000-000000000000', p_description: 'teste de conexao' }],
    ['approve_video', { p_agency_slug: 'nao-existe', p_client_slug: 'nao-existe', p_video_id: '00000000-0000-0000-0000-000000000000' }],
  ]
  for (const [name, payload] of rpcCalls) {
    const r = await rest(`/rest/v1/rpc/${name}`, anon, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const detail = typeof r.body === 'string' ? r.body.slice(0, 80) : JSON.stringify(r.body).slice(0, 80)
    console.log(String(r.status).padEnd(4), name.padEnd(20), detail)
  }

  if (secret) {
    console.log('\n=== admin API (auth) ===')
    const r = await fetch(base + '/auth/v1/admin/users?page=1&per_page=10', { headers: headers(secret) })
    const text = await r.text()
    let users = []
    try { users = JSON.parse(text).users || [] } catch {}
    console.log('status', r.status, '| usuários:', users.length)
    for (const u of users) console.log('  -', u.email, '| confirmado:', !!u.email_confirmed_at)
    if (r.status !== 200) console.log('  resposta:', text.slice(0, 200))
  }

  console.log('\n=== storage ===')
  const buckets = await rest('/storage/v1/bucket', secret || anon)
  if (Array.isArray(buckets.body)) {
    console.log('buckets:', buckets.body.map(b => `${b.name}(public=${b.public})`).join(', ') || 'nenhum')
  } else {
    console.log(String(buckets.status), String(JSON.stringify(buckets.body)).slice(0, 120))
  }
}

main().catch(e => {
  console.error('\nFALHOU:', e.message)
  process.exit(1)
})
