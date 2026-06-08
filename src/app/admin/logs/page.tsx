'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setLogs(data || []))
  }, [])

  const dotClass: Record<string, string> = {
    login: styles.logLogin, add: styles.logAdd, block: styles.logBlock, system: styles.logSystem
  }

  return (
    <div>
      <div className={styles.pageHead}><div><div className={styles.pageTitle}>Logs</div><div className={styles.pageSub}>Atividade na plataforma</div></div></div>
      <div className={`${styles.tbl} ${styles.logList}`}>
        {logs.length === 0 && <div className={styles.empty}>Nenhum log ainda — os logs aparecem conforme a plataforma for usada.</div>}
        {logs.map(l => (
          <div key={l.id} className={styles.logItem}>
            <div className={`${styles.logDot} ${dotClass[l.type] || styles.logSystem}`} />
            <div className={styles.logInfo}>
              <div className={styles.logTitle}>{l.message}</div>
              <div className={styles.logDate}>{new Date(l.created_at).toLocaleString('pt-BR')} · {l.agency_name || 'Sistema'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
