'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { GradientAvatar } from '@/components/GradientAvatar'
import { AgencyContext, type AgencyData, type Role, ROLE_LABEL } from './agency-context'
import styles from './shell.module.css'

const I = {
  overview: <path d="M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z" />,
  clients: <path d="M16 3.13a4 4 0 0 1 0 7.75M8 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm10 14v-1a4 4 0 0 0-3-3.87M2 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />,
  demands: <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />,
  revisions: <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />,
  team: <path d="M16 3.13a4 4 0 0 1 0 7.75M8 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm10 14v-1a4 4 0 0 0-3-3.87M2 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />,
}

function Icon({ d }: { d: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  )
}

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const path = usePathname()
  const [data, setData] = useState<AgencyData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadCounts = useCallback(async (agencyId: string) => {
    const { data: clientRows } = await supabase.from('clients').select('id').eq('agency_id', agencyId)
    const ids = (clientRows || []).map(c => c.id)
    let demandsPending = 0
    let revisionsOpen = 0
    if (ids.length > 0) {
      const { data: rev } = await supabase.from('revisions').select('id').in('client_id', ids).neq('status', 'done')
      revisionsOpen = (rev || []).length
      const { data: dm } = await supabase.from('demands').select('total').eq('agency_id', agencyId)
      demandsPending = (dm || []).length
    }
    return { clients: ids.length, demandsPending, revisionsOpen }
  }, [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    // Membro convidado? (editor/visualização) — senão é o dono da própria agência.
    let agencyId = user.id
    let role: Role = 'owner'
    let userName = user.email?.split('@')[0] || 'Usuário'
    try {
      const { data: member } = await supabase
        .from('agency_members').select('agency_id, role, name').eq('user_id', user.id).maybeSingle()
      if (member) {
        agencyId = member.agency_id
        role = (member.role as Role) || 'editor'
        if (member.name) userName = member.name
      }
    } catch { /* tabela ainda não migrada — trata como dono */ }

    const { data: agency } = await supabase
      .from('agencies').select('name, slug, logo_url').eq('id', agencyId).maybeSingle()

    const counts = await loadCounts(agencyId)

    setData({
      agencyId,
      agencySlug: agency?.slug || '',
      agencyName: agency?.name || 'Minha agência',
      logoUrl: agency?.logo_url || null,
      role,
      userName,
      userEmail: user.email || '',
      canEdit: role !== 'viewer',
      isOwner: role === 'owner',
      counts,
      refresh: () => { loadCounts(agencyId).then(c => setData(prev => prev ? { ...prev, counts: c } : prev)) },
    })
    setLoading(false)
  }, [router, loadCounts])

  useEffect(() => { load() }, [load])

  if (loading || !data) return <div className={styles.loading}>Carregando…</div>

  const nav = [
    { label: 'Overview', icon: I.overview, href: '/agency', match: (p: string) => p === '/agency' },
    { label: 'Clientes', icon: I.clients, href: '/agency/clients', match: (p: string) => p.startsWith('/agency/clients') || p.startsWith('/agency/client/') },
    { label: 'Demandas', icon: I.demands, href: '/agency/demands', badge: data.counts.demandsPending, amber: true, match: (p: string) => p.startsWith('/agency/demands') },
    { label: 'Alterações', icon: I.revisions, href: '/agency/revisions', badge: data.counts.revisionsOpen, match: (p: string) => p.startsWith('/agency/revisions') },
    { label: 'Equipe', icon: I.team, href: '/agency/team', match: (p: string) => p.startsWith('/agency/team') },
    { label: 'Configurações', icon: I.settings, href: '/agency/settings', match: (p: string) => p.startsWith('/agency/settings') },
  ]

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <AgencyContext.Provider value={data}>
      <div className={styles.app}>
        <aside className={styles.sidebar}>
          <div className={styles.logoWrap}>
            <Logo size={34} wordmark subtitle={data.agencyName} />
          </div>
          <div className={styles.sectionLabel}>Menu</div>
          <nav className={styles.nav}>
            {nav.map(n => {
              const active = n.match(path)
              return (
                <button
                  key={n.href}
                  className={`${styles.navItem} ${active ? styles.navOn : ''}`}
                  onClick={() => router.push(n.href)}
                >
                  <Icon d={n.icon} />
                  {n.label}
                  {!!n.badge && n.badge > 0 && (
                    <span className={`${styles.badge} ${n.amber ? styles.badgeAmber : ''}`}>{n.badge}</span>
                  )}
                </button>
              )
            })}
          </nav>
          <div className={styles.foot}>
            <div className={styles.userRow}>
              <GradientAvatar name={data.userName} size={36} />
              <div className={styles.userInfo}>
                <div className={styles.userName}>{data.userName}</div>
                <div className={styles.userRole}>{ROLE_LABEL[data.role]}</div>
              </div>
            </div>
            <button className={styles.logout} onClick={logout}>
              <Icon d={I.logout} /> Sair
            </button>
          </div>
        </aside>
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </AgencyContext.Provider>
  )
}
