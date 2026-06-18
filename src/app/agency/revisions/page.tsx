'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Revision } from '@/lib/types'
import styles from '../agency.module.css'

export default function RevisionsPage() {
  const router = useRouter()
  const [revisions, setRevisions] = useState<(Revision & { video_title?: string; client_name?: string })[]>([])
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: clients } = await supabase.from('clients').select('id, name').eq('agency_id', user.id)
    const ids = (clients || []).map(c => c.id)
    if (ids.length === 0) { setLoading(false); return }

    const { data: revData } = await supabase
      .from('revisions').select('*, videos(title)').in('client_id', ids).order('created_at', { ascending: false })

    const enriched = (revData || []).map((r: any) => ({
      ...r,
      video_title: r.videos?.title,
      client_name: (clients || []).find((c: any) => c.id === r.client_id)?.name,
    }))
    setRevisions(enriched)
    setLoading(false)
  }

  async function resolve(id: string) {
    await supabase.from('revisions').update({ status: 'done' }).eq('id', id)
    setRevisions(prev => prev.map(r => r.id === id ? { ...r, status: 'done' as const } : r))
  }

  if (loading) return <div className={styles.loading}>Carregando...</div>

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.sLogo}>
          <div className={styles.sLogoTop}>Deliver</div>
          <div className={styles.sLogoName}>Painel da agência</div>
        </div>
        <nav className={styles.sNav}>
  <div className={styles.navItem} onClick={() => router.push('/agency')}>
    <span>👥</span> Clientes
  </div>
  <div className={styles.navItem} onClick={() => router.push('/agency/demands')}>
    <span>📋</span> Demandas
  </div>
  <div className={styles.navItem} onClick={() => router.push('/agency/revisions')}>
    <span>✏️</span> Alterações
  </div>
  <div className={styles.navItem} onClick={() => router.push('/agency/settings')}>
    <span>⚙️</span> Configurações
  </div>
</nav>
        <div className={styles.sFoot}>
          <button className={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Sair</button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.pageHead}>
          <div>
            <div className={styles.pageTitle}>Alterações</div>
            <div className={styles.pageSub}>{revisions.filter(r => r.status !== 'done').length} pendentes</div>
          </div>
        </div>
        <div className={styles.clientList}>
          {revisions.length === 0 && <div className={styles.empty}>Nenhuma alteração ainda.</div>}
          {revisions.map(r => (
            <div key={r.id} className={styles.clientCard}>
              <div className={styles.cInfo}>
                <div className={styles.cName}>{r.client_name} — {r.video_title}</div>
                <div className={styles.cMeta}>{r.description}</div>
                <div className={styles.cMeta} style={{ marginTop: 4 }}>
                  {new Date(r.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              {r.status === 'done'
                ? <span style={{ fontSize: 11, color: 'var(--green)', padding: '4px 10px' }}>Resolvido</span>
                : <button className={styles.btnCopy} onClick={() => resolve(r.id)}>Resolver</button>
              }
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
