'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { GradientAvatar } from '@/components/GradientAvatar'
import { AgencyContext, ROLE_LABEL, type AgencyData, type Role } from './agency-context'
import s from './shell.module.css'

interface AgencyLayoutClientProps {
  children: React.ReactNode
  agencyId: string
  role: Role | null
}

type Counts = AgencyData['counts']

const EMPTY_COUNTS: Counts = { clients: 0, demandsPending: 0, revisionsOpen: 0 }

const NAV = [
  { href: '/agency', label: 'Visão geral', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { href: '/agency/clients', label: 'Clientes', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8M23 21v-2a4 4 0 0 0-3-3.87' },
  { href: '/agency/demands', label: 'Demandas', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 12h6M9 16h4' },
  { href: '/agency/revisions', label: 'Alterações', icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' },
  { href: '/agency/team', label: 'Equipe', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11' },
  { href: '/agency/settings', label: 'Configurações', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1' },
]

export default function AgencyLayoutClient({ children, agencyId, role }: AgencyLayoutClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [agency, setAgency] = useState<{ name: string; slug: string; logo_url: string | null } | null>(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(Boolean(agencyId))
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)

  const loadCounts = useCallback(async () => {
    if (!agencyId) return

    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('agency_id', agencyId)

    const ids = (clients || []).map(c => c.id)

    const demandsQuery = supabase
      .from('demands')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)

    const revisionsQuery = ids.length
      ? supabase.from('revisions').select('*', { count: 'exact', head: true }).in('client_id', ids).neq('status', 'done')
      : null

    const [demandsRes, revisionsRes] = await Promise.all([
      demandsQuery,
      revisionsQuery ?? Promise.resolve({ count: 0 }),
    ])

    setCounts({
      clients: ids.length,
      demandsPending: demandsRes.count || 0,
      revisionsOpen: revisionsRes.count || 0,
    })
  }, [agencyId])

  const refresh = useCallback(() => { void loadCounts() }, [loadCounts])

  useEffect(() => {
    if (!agencyId) { setLoading(false); return }

    let alive = true

    async function load() {
      try {
        const [{ data: agencyData }, { data: { user } }] = await Promise.all([
          supabase.from('agencies').select('name, slug, logo_url').eq('id', agencyId).maybeSingle(),
          supabase.auth.getUser(),
        ])
        if (!alive) return

        if (agencyData) setAgency(agencyData)
        if (user) {
          setUserEmail(user.email || '')
          setUserName(user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuário'))

          // Admin do sistema pode alternar para o painel /admin
          if (user.email) {
            const { data: adminRow } = await supabase
              .from('admin_users')
              .select('email')
              .eq('email', user.email)
              .maybeSingle()
            if (alive) setIsSystemAdmin(Boolean(adminRow))
          }
        }

        await loadCounts()
      } catch (err) {
        console.error('Erro ao carregar agência:', err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [agencyId, loadCounts])

  useEffect(() => { if (pathname) refresh() }, [pathname, refresh])

  const value = useMemo<AgencyData>(() => ({
    agencyId,
    agencySlug: agency?.slug || '',
    agencyName: agency?.name || 'Minha agência',
    logoUrl: agency?.logo_url ?? null,
    role: role || 'viewer',
    userName,
    userEmail,
    canEdit: role !== 'viewer',
    isOwner: role === 'owner',
    counts,
    refresh,
  }), [agencyId, agency, role, userName, userEmail, counts, refresh])

  if (!agencyId) {
    return (
      <div className={s.loading} style={{ flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 22 }}>⚠️</div>
        <div>Nenhuma agência encontrada para esta conta.</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 380, textAlign: 'center' }}>
          {isSystemAdmin
            ? 'Você é administrador do sistema, mas ainda não tem uma agência própria. Crie uma em Agências ou peça para vincular a sua conta.'
            : 'Peça ao dono da agência para te adicionar em Equipe, ou crie a sua própria agência.'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {isSystemAdmin && (
            <button className="btnGrad" onClick={() => router.push('/admin/agencies')}>Ir para Agências (admin)</button>
          )}
          <button className={isSystemAdmin ? 'btnGhost' : 'btnGrad'} onClick={() => router.push('/')}>Voltar para o login</button>
        </div>
      </div>
    )
  }

  if (loading) return <div className={s.loading}>Carregando painel…</div>

  const badge = (href: string) => {
    if (href === '/agency/revisions' && counts.revisionsOpen > 0) return counts.revisionsOpen
    if (href === '/agency/demands' && counts.demandsPending > 0) return counts.demandsPending
    return 0
  }

  return (
    <AgencyContext.Provider value={value}>
      <div className={s.app}>
        <aside className={s.sidebar}>
          <div className={s.logoWrap}>
            <Logo size={34} customLogoUrl={agency?.logo_url} agencyName={agency?.name || 'Agência'} />
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agency?.name || 'Agência'}
            </div>
          </div>

          <div className={s.sectionLabel}>Menu</div>

          <nav className={s.nav}>
            {NAV.map(item => {
              const active = item.href === '/agency' ? pathname === '/agency' : pathname.startsWith(item.href)
              const count = badge(item.href)
              return (
                <button
                  key={item.href}
                  className={`${s.navItem} ${active ? s.navOn : ''}`}
                  onClick={() => router.push(item.href)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                  {count > 0 && <span className={`${s.badge} ${active ? '' : s.badgeAmber}`}>{count}</span>}
                </button>
              )
            })}
          </nav>

          {isSystemAdmin && (
            <>
              <div className={s.sectionLabel}>Sistema</div>
              <nav className={s.nav}>
                <button className={s.navItem} onClick={() => router.push('/admin')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                  </svg>
                  Painel admin
                </button>
              </nav>
            </>
          )}

          <div className={s.foot}>
            <div className={s.userRow}>
              <GradientAvatar name={userName || 'U'} size={34} radius={10} />
              <div className={s.userInfo}>
                <div className={s.userName}>{userName || 'Usuário'}</div>
                <div className={s.userRole}>{ROLE_LABEL[role || 'viewer']}</div>
              </div>
            </div>
            <button
              className={s.logout}
              onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sair
            </button>
          </div>
        </aside>

        <main className={s.main}>
          <div className={s.content}>{children}</div>
        </main>
      </div>
    </AgencyContext.Provider>
  )
}
