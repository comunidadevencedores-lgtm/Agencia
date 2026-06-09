'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './admin.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const path = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      const { data } = await supabase.from('admin_users').select('email').eq('email', user.email!).single()
      if (!data) { router.push('/agency'); return }
      setChecking(false)
    })
  }, [])

  const nav = [
    { label: 'Visão geral', path: '/admin', icon: '📊' },
    { label: 'Agências', path: '/admin/agencies', icon: '🏢' },
    { label: 'Planos', path: '/admin/plans', icon: '💳' },
    { label: 'Receita', path: '/admin/revenue', icon: '📈' },
    { label: 'Logs', path: '/admin/logs', icon: '📋' },
    { label: 'Admins', path: '/admin/admins', icon: '👤' },
    { label: 'Config', path: '/admin/settings', icon: '⚙️' },
  ]

  if (checking) return <div className={styles.loading}>Verificando acesso...</div>

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.sLogo}>
          <div className={styles.sLogoTop}>Deliver</div>
          <div className={styles.sLogoName}>Super Admin</div>
          <span className={styles.adminBadge}>ADMIN</span>
        </div>
        <nav className={styles.sNav}>
          {nav.map(n => (
            <button key={n.path} className={`${styles.navItem} ${path === n.path ? styles.navOn : ''}`} onClick={() => router.push(n.path)}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className={styles.sFoot}>
          <div className={styles.footInfo}>Logado como admin</div>
          <button className={styles.footBtn} onClick={() => router.push('/agency')}>← Ir para agência</button>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
