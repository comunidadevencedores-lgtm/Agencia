/**
 * Configura o Supabase do Deliver a partir de um Personal Access Token.
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *   node scripts/setup-supabase.mjs --list
 *   node scripts/setup-supabase.mjs --project <ref>
 *
 * O que faz:
 *   1. lista os projetos da conta (--list)
 *   2. roda supabase/000_setup.sql no projeto escolhido
 *   3. pega anon key + service_role key
 *   4. escreve .env.local
 *   5. valida a conexão (REST + RPC)
 *
 * O token NUNCA é gravado em arquivo.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const API = 'https://api.supabase.com/v1'
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!token) {
  console.error('Defina SUPABASE_ACCESS_TOKEN (sbp_...) no ambiente.')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

async function api(pathname, init = {}) {
  const res = await fetch(API + pathname, { ...init, headers: { ...headers, ...(init.headers || {}) } })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathname} -> ${res.status} ${text.slice(0, 300)}`)
  return body
}

const args = process.argv.slice(2)
const listOnly = args.includes('--list')
const refArg = args.includes('--project') ? args[args.indexOf('--project') + 1] : null

const projects = await api('/projects')

if (listOnly || !refArg) {
  console.log('\nProjetos na conta:\n')
  for (const p of projects) {
    console.log(`  ${p.id}  ${String(p.status || '?').padEnd(10)} ${String(p.region || '').padEnd(16)} ${p.name}`)
  }
  console.log('\nRode de novo com:  --project <ref>')
  process.exit(0)
}

const project = projects.find(p => p.id === refArg || p.name === refArg)
if (!project) {
  console.error(`Projeto "${refArg}" não encontrado. Use --list para ver os disponíveis.`)
  process.exit(1)
}

console.log(`\n▶ Projeto: ${project.name} (${project.id}) — status: ${project.status}`)
if (project.status !== 'ACTIVE_HEALTHY' && project.status !== 'ACTIVE') {
  console.warn('⚠ O projeto não está ACTIVE_HEALTHY. Se estiver pausado, restaure no dashboard antes de continuar.')
}

// 1) SQL
const sqlPath = path.join(process.cwd(), 'supabase', '000_setup.sql')
const sql = await readFile(sqlPath, 'utf8')
console.log(`▶ Rodando ${sqlPath} (${sql.length} bytes)…`)
await api(`/projects/${project.id}/database/query`, {
  method: 'POST',
  body: JSON.stringify({ query: sql }),
})
console.log('✓ SQL aplicado')

// 2) Chaves
const keys = await api(`/projects/${project.id}/api-keys?reveal=true`)
const anon = keys.find(k => k.name === 'anon' || k.type === 'publishable')
const service = keys.find(k => k.name === 'service_role' || k.type === 'secret')

if (!anon || !service) {
  console.error('Não encontrei as chaves anon/service_role. Retorno:', JSON.stringify(keys).slice(0, 500))
  process.exit(1)
}

const url = `https://${project.id}.supabase.co`
const env = `# Gerado por scripts/setup-supabase.mjs — não commitar
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon.api_key || anon.apiKey}
SUPABASE_SERVICE_ROLE_KEY=${service.api_key || service.apiKey}
`
await writeFile(path.join(process.cwd(), '.env.local'), env, 'utf8')
console.log('✓ .env.local escrito')

// 3) Validação
const anonKey = anon.api_key || anon.apiKey
const check = await fetch(`${url}/rest/v1/agencies?select=id&limit=1`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
})
console.log(`✓ REST /agencies -> ${check.status} (200 = tabela existe e responde)`)

const rpc = await fetch(`${url}/rest/v1/rpc/get_client_portal`, {
  method: 'POST',
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_agency_slug: 'nao-existe', p_client_slug: 'nao-existe' }),
})
console.log(`✓ RPC get_client_portal -> ${rpc.status} (200 = função criada)`)

console.log('\nPronto. Rode: npm run dev\n')
