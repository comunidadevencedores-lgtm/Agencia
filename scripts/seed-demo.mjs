/**
 * Cria um cenário de teste completo (agência + cliente + projeto + vídeos + revisão)
 * usando a service_role key. Serve para validar o app ponta a ponta.
 *
 *   node scripts/seed-demo.mjs          -> cria (idempotente)
 *   node scripts/seed-demo.mjs --clean  -> remove tudo do cenário de teste
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

const raw = await readFile(path.join(root, '.env.local'), 'utf8')
const env = {}
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')
const secret = env.SUPABASE_SERVICE_ROLE_KEY
if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no .env.local')

const H = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }

const DEMO = {
  email: 'teste.agencia@deliver.local',
  password: 'Teste@12345',
  agencyName: 'Agência Teste',
  agencySlug: 'agencia-teste',
  clientName: 'Cliente Teste',
  clientSlug: 'cliente-teste',
}

async function call(pathname, init = {}) {
  const res = await fetch(base + pathname, { ...init, headers: { ...H, ...(init.headers || {}) } })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathname} -> ${res.status} ${text.slice(0, 300)}`)
  return body
}

async function findUserByEmail(email) {
  const data = await call('/auth/v1/admin/users?page=1&per_page=200')
  return (data.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase())
}

async function ensureUser() {
  const existing = await findUserByEmail(DEMO.email)
  if (existing) {
    await call(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify({ password: DEMO.password, email_confirm: true }),
    })
    console.log('• usuário já existia:', DEMO.email)
    return existing.id
  }
  const created = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: DEMO.email, password: DEMO.password, email_confirm: true }),
  })
  console.log('• usuário criado:', DEMO.email)
  return created.id
}

async function clean(userId) {
  const agencies = await call(`/rest/v1/agencies?select=id&slug=eq.${DEMO.agencySlug}`)
  for (const a of agencies) {
    await call(`/rest/v1/agencies?id=eq.${a.id}`, { method: 'DELETE' })
  }
  if (userId) await call(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
  console.log('✓ cenário de teste removido')
}

const userId = await ensureUser()

if (process.argv.includes('--clean')) {
  await clean(userId)
  process.exit(0)
}

// agência (dono = auth.uid())
const agencyRows = await call(
  `/rest/v1/agencies?on_conflict=id&select=id`,
  {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{
      id: userId,
      name: DEMO.agencyName,
      email: DEMO.email,
      slug: DEMO.agencySlug,
      plan: 'pro',
      status: 'active',
    }]),
  },
)
const agencyId = agencyRows[0]?.id || userId
console.log('• agência:', agencyId)

await call('/rest/v1/agency_members?on_conflict=user_id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify([{
    agency_id: agencyId,
    user_id: userId,
    name: 'Dono Teste',
    email: DEMO.email,
    role: 'owner',
  }]),
})

// cliente
const clientRows = await call(
  `/rest/v1/clients?on_conflict=agency_id,slug&select=id`,
  {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{
      agency_id: agencyId,
      name: DEMO.clientName,
      slug: DEMO.clientSlug,
      phone: '(11) 99999-0000',
      email: 'contato@clienteteste.com',
      monthly_revenue: 12500,
    }]),
  },
)
const clientId = clientRows[0].id
console.log('• cliente:', clientId)

// projeto
let projects = await call(`/rest/v1/projects?select=id&client_id=eq.${clientId}&title=eq.${encodeURIComponent('Campanha de Outubro')}`)
let projectId = projects[0]?.id
if (!projectId) {
  const created = await call('/rest/v1/projects?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ client_id: clientId, title: 'Campanha de Outubro', status: 'active' }]),
  })
  projectId = created[0].id
}
console.log('• projeto:', projectId)

// vídeos
let videos = await call(`/rest/v1/videos?select=id,title&project_id=eq.${projectId}`)
if (videos.length === 0) {
  videos = await call('/rest/v1/videos?select=id,title', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      {
        project_id: projectId,
        title: 'Reels 01 — Lançamento',
        youtube_url: 'https://www.youtube.com/shorts/aqz-KE-bpKQ',
        drive_url: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view',
        duration: '00:32',
        orientation: 'vertical',
        status: 'pending',
        approved_by_client: false,
        approved_at: null,
      },
      {
        project_id: projectId,
        title: 'Reels 02 — Depoimento',
        youtube_url: 'https://youtu.be/M7lc1UVf-VE',
        drive_url: null,
        duration: '00:45',
        orientation: 'vertical',
        status: 'approved',
        approved_by_client: true,
        approved_at: new Date().toISOString(),
      },
    ]),
  })
}
console.log('• vídeos:', videos.length)

// revisão aberta
const revs = await call(`/rest/v1/revisions?select=id&client_id=eq.${clientId}`)
if (revs.length === 0) {
  await call('/rest/v1/revisions', {
    method: 'POST',
    body: JSON.stringify([{
      video_id: videos[0].id,
      client_id: clientId,
      description: 'Trocar a trilha e encurtar o final em 3 segundos.',
      status: 'open',
    }]),
  })
  console.log('• revisão aberta criada')
}

console.log('\n✓ cenário pronto')
console.log(`  login    : ${DEMO.email}`)
console.log(`  senha    : ${DEMO.password}`)
console.log(`  portal   : /c/${DEMO.agencySlug}/${DEMO.clientSlug}`)
