import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/** Confirma que o requisitante é o DONO de uma agência e devolve seu agencyId. */
async function requireOwner(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { error: 'Não autenticado', status: 401 as const }

  const admin = supabaseAdmin()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return { error: 'Sessão inválida', status: 401 as const }

  // O dono da agência tem auth.uid === agencies.id
  const { data: agency } = await admin.from('agencies').select('id').eq('id', user.id).maybeSingle()
  if (!agency) return { error: 'Apenas o dono da agência pode gerenciar a equipe', status: 403 as const }

  return { admin, agencyId: user.id, ownerId: user.id }
}

export async function POST(req: Request) {
  const ctx = await requireOwner(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { admin, agencyId } = ctx

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }) }
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const role = body.role === 'viewer' ? 'viewer' : 'editor'

  if (!email || password.length < 6) {
    return NextResponse.json({ error: 'Email válido e senha de 6+ caracteres são obrigatórios' }, { status: 400 })
  }

  // 1. Cria a conta de autenticação (já confirmada)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  })
  if (createErr || !created?.user) {
    return NextResponse.json({ error: createErr?.message || 'Falha ao criar usuário' }, { status: 400 })
  }

  // 2. Vincula como membro da agência
  const { data: member, error: memberErr } = await admin.from('agency_members').insert({
    agency_id: agencyId, user_id: created.user.id, name: name || email.split('@')[0], email, role,
  }).select().single()

  if (memberErr) {
    // desfaz a conta criada para não deixar lixo
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: memberErr.message }, { status: 400 })
  }

  return NextResponse.json({ member })
}

export async function DELETE(req: Request) {
  const ctx = await requireOwner(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { admin, agencyId } = ctx

  const userId = new URL(req.url).searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  // garante que o membro pertence a esta agência
  const { data: member } = await admin.from('agency_members')
    .select('id').eq('agency_id', agencyId).eq('user_id', userId).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  await admin.from('agency_members').delete().eq('user_id', userId).eq('agency_id', agencyId)
  await admin.auth.admin.deleteUser(userId)

  return NextResponse.json({ ok: true })
}
