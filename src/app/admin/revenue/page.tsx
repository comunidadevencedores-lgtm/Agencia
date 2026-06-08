'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

const PRICES: Record<string, number> = { pro: 197, basic: 97, trial: 0 }

export default function AdminRevenue() {
  const [agencies, setAgencies] = useState<any[]>([])

  useEffect(() => {
    supabase.from('agencies').select('*').order('created_at', { ascending: false }).then(({ data }) => setAgencies(data || []))
  }, [])

  const mrr = agencies.filter(a => a.status !== 'blocked').reduce((acc, a) => acc + (PRICES[a.plan] || 0), 0)
  const active = agencies.filter(a => a.status !== 'blocked' && a.plan !== 'trial').length

  return (
    <div>
      <div className={styles.pageHead}><div><div className={styles.pageTitle}>Receita</div><div className={styles.pageSub}>Visão financeira das assinaturas</div></div></div>
      <div className={`${styles.stats} ${styles.stats3}`}>
        <div className={styles.stat}><div className={styles.statLabel}>MRR (mensal recorrente)</div><div className={styles.statVal}>R${mrr}</div><div className={styles.statSub}>{active} assinantes pagantes</div></div>
        <div className={styles.stat}><div className={styles.statLabel}>ARR (anual projetado)</div><div className={styles.statVal}>R${mrr * 12}</div><div className={styles.statSub}>baseado no MRR atual</div></div>
        <div className={styles.stat}><div className={styles.statLabel}>Em trial</div><div className={styles.statVal}>{agencies.filter(a => a.plan === 'trial').length}</div><div className={styles.statSub}>potencial de conversão</div></div>
      </div>
      <div className={styles.secLabel}>Assinaturas</div>
      <div className={styles.tbl}>
        <div className={`${styles.tblHead} ${styles.rv4}`}><span>Agência</span><span>Plano</span><span>Valor/mês</span><span>Status</span></div>
        {agencies.map(ag => (
          <div key={ag.id} className={`${styles.tblRow} ${styles.rv4}`}>
            <div><div className={styles.name}>{ag.name}</div><div className={styles.sub}>{ag.email}</div></div>
            <div><span className={`${styles.tag} ${ag.plan === 'pro' ? styles.tPro : ag.plan === 'trial' ? styles.tTrial : styles.tBasic}`}>{ag.plan || 'básico'}</span></div>
            <div style={{ color: PRICES[ag.plan] ? 'var(--green)' : 'var(--text3)' }}>
              {PRICES[ag.plan] ? `R$${PRICES[ag.plan]}` : '—'}
            </div>
            <div><span className={`${styles.tag} ${ag.status === 'blocked' ? styles.tBlocked : styles.tActive}`}>{ag.status === 'blocked' ? 'Bloqueado' : 'Ativo'}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
