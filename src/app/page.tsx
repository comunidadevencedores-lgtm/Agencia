'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(`Erro: ${error.message}`); setLoading(false); return }

    const { data: adminCheck } = await supabase.from('admin_users').select('email').eq('email', data.user?.email!).single()
    router.push(adminCheck ? '/admin' : '/agency')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.glow} />
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logo size={48} />
        </div>
        <div className={styles.title}>Bem-vindo de volta</div>
        <p className={styles.sub}>Entre no painel da sua agência</p>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="agencia@email.com" required />
          </div>
          <div className={styles.field}>
            <label>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className="btnGrad" style={{ width: '100%', padding: 12, marginTop: 4 }} disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
      <div className={styles.footer}>Deliver · portal de entrega de criativos</div>
    </div>
  )
}
