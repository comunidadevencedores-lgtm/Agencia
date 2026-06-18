'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './settings.module.css'
import agStyles from '../agency.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedPwd, setSavedPwd] = useState(false)
  const [errPwd, setErrPwd] = useState('')
  const [userId, setUserId] = useState('')

  const [form, setForm] = useState({ name: '', email: '', slug: '', logo_url: '' })
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUserId(user.id)

    // .maybeSingle() não gera erro caso a linha não exista (evita o 406)
    const { data: agency, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) console.error('Erro ao carregar agência:', error.message)

    if (agency) {
      setForm({ 
        name: agency.name || '', 
        email: agency.email || user.email || '', 
        slug: agency.slug || '', 
        logo_url: agency.logo_url || '' 
      })
    } else {
      // Caso seja o primeiro acesso, pré-carrega o email do login
      setForm(p => ({ ...p, email: user.email || '' }))
    }
    setLoading(false)
  }

  function toSlug(str: string) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function saveAgency() {
    if (!form.name) return
    setSaving(true)
    
    // .upsert cria se não existir ou atualiza se já existir
    const { error } = await supabase.from('agencies').upsert({
      id: userId,
      name: form.name,
      email: form.email,
      slug: toSlug(form.slug || form.name),
      logo_url: form.logo_url || null,
    })

    if (error) {
      console.error(error)
      alert('Erro ao salvar dados.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function savePassword() {
    setErrPwd('')
    if (pwd.new !== pwd.confirm) { setErrPwd('As senhas não coincidem'); return }
    if (pwd.new.length < 6) { setErrPwd('Mínimo 6 caracteres'); return }
    
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: pwd.new })
    
    if (error) { 
      setErrPwd(error.message)
      setSavingPwd(false)
      return 
    }
    
    setSavedPwd(true)
    setPwd({ current: '', new: '', confirm: '' })
    setTimeout(() => setSavedPwd(false), 2500)
    setSavingPwd(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className={agStyles.loading}>Carregando...</div>

  return (
    <div className={agStyles.app}>
      <aside className={agStyles.sidebar}>
        <div className={agStyles.sLogo}>
          <div className={agStyles.sLogoTop}>Deliver</div>
          <div className={agStyles.sLogoName}>Painel da agência</div>
        </div>
        <nav className={agStyles.sNav}>
          <div className={agStyles.navItem} onClick={() => router.push('/agency')}>
            <span>{"👥"}</span> Clientes
          </div>
          <div className={agStyles.navItem} onClick={() => router.push('/agency/demands')}>
            <span>{"📋"}</span> Demandas
          </div>
          <div className={agStyles.navItem} onClick={() => router.push('/agency/revisions')}>
            <span>{"✏️"}</span> Alterações
          </div>
          <div className={agStyles.navItem} data-active="true">
            <span>{"⚙️"}</span> Configurações
          </div>
        </nav>
        <div className={agStyles.sFoot}>
          <button className={agStyles.logoutBtn} onClick={logout}>Sair</button>
        </div>
      </aside>

      <main className={agStyles.main}>
        <div className={agStyles.pageHead}>
          <div>
            <div className={agStyles.pageTitle}>Configurações</div>
            <div className={agStyles.pageSub}>Dados da agência e conta</div>
          </div>
        </div>

        {/* DADOS DA AGÊNCIA */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Dados da agência</div>
          <div className={styles.cardBody}>
            <div className={agStyles.fGroup}>
              <label>Nome da agência</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Agência Flip" />
            </div>
            <div className={agStyles.fGroup}>
              <label>Slug (aparece no link dos clientes)</label>
              <input type="text" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="ex: agencia-flip" />
              <div className={styles.hint}>Link do cliente: deliver.vercel.app/c/<strong>{toSlug(form.slug || form.name) || 'seu-slug'}</strong>/nome-do-cliente</div>
            </div>
            <div className={agStyles.fGroup}>
              <label>Logo (URL da imagem)</label>
              <input type="text" value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <div className={styles.cardFoot}>
            <button className={agStyles.btnPrimary} onClick={saveAgency} disabled={saving}>
              {saved ? '✓ Salvo!' : saving ? 'Salvando...' : 'Salvar dados'}
            </button>
          </div>
        </div>

        {/* TROCAR SENHA */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Trocar senha</div>
          <div className={styles.cardBody}>
            <div className={agStyles.fGroup}>
              <label>Nova senha</label>
              <input type="password" value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className={agStyles.fGroup}>
              <label>Confirmar nova senha</label>
              <input type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
            </div>
            {errPwd && <div className={styles.err}>{errPwd}</div>}
          </div>
          <div className={styles.cardFoot}>
            <button className={agStyles.btnPrimary} onClick={savePassword} disabled={savingPwd}>
              {savedPwd ? '✓ Senha alterada!' : savingPwd ? 'Salvando...' : 'Trocar senha'}
            </button>
          </div>
        </div>

        {/* PERIGO */}
        <div className={styles.card} style={{ borderColor: '#ff4d4f22' }}>
          <div className={styles.cardTitle} style={{ color: 'var(--red)' }}>Sair da conta</div>
          <div className={styles.cardBody}>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>Você será redirecionado para a tela de login.</p>
          </div>
          <div className={styles.cardFoot}>
            <button className={styles.btnDanger} onClick={logout}>Sair da conta</button>
          </div>
        </div>
      </main>
    </div>
  )
}
