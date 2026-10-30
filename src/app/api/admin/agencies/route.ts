import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Cria uma agência (usuário de login + registro + vínculo de dono).
 *
 * Fica no servidor por dois motivos:
 *  1. `supabase.auth.signUp` no navegador trocava a sessão do admin pela do novo usuário;
 *  2. a criação precisa da service_role key para não esbarrar no RLS.
 */
export async function POST(request: Request) {
  let admin
  try {
    admin = supabaseAdmin()
  } catch {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 500 },
    )
  }

  // 1) quem está chamando? (Bearer do cliente; cookie como fallback)
  let user = null

  const bearer = request.headers.get('authorization')?.replace(/^Bearer /i, '').trim()
  if (bearer) {
    const { data } = await admin.auth.getUser(bearer)
    user = data.user
  }

  if (!user) {
    const supabase = await createSupabaseServer()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user?.email) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
  }

  // 2) é admin do sistema?
  const { data: adminRow } = await admin
    .from('admin_users')
    .select('id')
    .ilike('email', user.email)
    .maybeSingle()

  if (!adminRow) {
    return NextResponse.json({ error: 'Apenas administradores podem criar agências.' }, { status: 403 })
  }

  // 3) valida o formulário
  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const slug = String(body.slug || '').trim().toLowerCase()
  const plan = ['trial', 'basic', 'pro'].includes(body.plan) ? body.plan : 'trial'

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, { status: 400 })
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug inválido. Use apenas letras, números e hífen.' }, { status: 400 })
  }

  // 4) cria o login
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !created?.user) {
    const message = /already/i.test(authError?.message || '')
      ? 'Já existe um usuário com esse e-mail.'
      : authError?.message || 'Não foi possível criar o usuário.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const agencyId = created.user.id

  // 5) cria a agência
  const { error: agencyError } = await admin.from('agencies').insert({
    id: agencyId,
    name,
    email,
    slug,
    plan,
    status: 'active',
  })

  if (agencyError) {
    await admin.auth.admin.deleteUser(agencyId)
    const message = /duplicate|unique/i.test(agencyError.message)
      ? 'Já existe uma agência com esse slug.'
      : agencyError.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 6) dono + log
  const { error: memberError } = await admin.from('agency_members').insert({
    agency_id: agencyId,
    user_id: agencyId,
    name,
    email,
    role: 'owner',
  })

  if (memberError) {
    await admin.from('agencies').delete().eq('id', agencyId)
    await admin.auth.admin.deleteUser(agencyId)
    return NextResponse.json({ error: memberError.message }, { status: 400 })
  }

  await admin.from('admin_logs').insert({
    type: 'agency_created',
    message: `Agência "${name}" criada`,
    agency_id: agencyId,
    agency_name: name,
  })

  return NextResponse.json({ ok: true, id: agencyId, slug })
}
