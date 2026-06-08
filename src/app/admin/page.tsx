'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './admin.module.css'

export default function AdminOverview() {
  const router = useRouter()
  const [stats, setStats] = useState({ agencies: 0, clients: 0, videos: 0, revisions: 0 })
  const [agencies, setAgencies] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data: ag } = await supabase.from('agencies').select('*, clients(count)')
    const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true })
    const { count: videoCount } = await supabase.from('videos').select('*', { count: 'exact', head: true })
    const { count: revCount } = await supabase.from('revisions').select('*', { count: 'exact', head: true }).eq('status', 'open')
    setStats({ agencies: ag?.length || 0, clients: clientCount || 0, videos: videoCount || 0, revisions: revCount || 0 })
    setAgencies((ag || []).slice(0, 5))
  }

  function initials(name: string) {
    return name?.split(' ').slice(0, 2).filter(w => w).map(w => w[0].toUpperCase()).join('') || '?'
  }

  return (
    <div>
      <div className={styles.pageHead}>
        <div><div className={styles.pageTitle}>Visão geral</div><div className={styles.pageSub}>Resumo da plataforma Deliver</div></div>
      </div>
      <div className={`${styles.stats} ${styles.stats4}`}>
        <div className={styles.stat}><div className={styles.statLabel}>Agências ativas</div><div className={styles.statVal}>{stats.agencies}</div></div>
        <div className={styles.stat}><div className={styles.statLabel}>Clientes totais</div><div className={styles.statVal}>{stats.clients}</div></div>
        <div className={styles.stat}><div className={styles.statLabel}>Vídeos entregues</div><div className={styles.statVal}>{stats.videos}</div></div>
        <div className={styles.stat}><div className={styles.statLabel}>Alterações abertas</div><div className={styles.statVal}>{stats.revisions}</div></div>
      </div>
      <div className={styles.secLabel}>Agências cadastradas</div>
      <div className={styles.tbl}>
        {agencies.length === 0 && <div className={styles.empty}>Nenhuma agência ainda.</div>}
        {agencies.map(ag => (
          <div key={ag.id} className={`${styles.tblRow} ${styles.ag5}`} onClick={() => router.push(`/admin/agencies/${ag.id}`)}>
            <div>
              <div className={styles.name}>{ag.name}</div>
              <div className={styles.sub}>{ag.email}</div>
            </div>
            <div><span className={`${styles.tag} ${styles.tActive}`}>Ativo</span></div>
            <div style={{ color: 'var(--text2)' }}>{ag.clients?.[0]?.count || 0}</div>
            <div><span className={`${styles.tag} ${styles.tPro}`}>Pro</span></div>
            <div className={styles.actions}>
              <button className={styles.btnXs} onClick={e => { e.stopPropagation(); router.push(`/admin/agencies/${ag.id}`) }}>Ver →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
