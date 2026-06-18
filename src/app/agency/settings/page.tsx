'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAgency } from '../agency-context'
import s from '../pages.module.css'
import styles from './settings.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const { agencyId, isOwner, userEmail } = useAgency()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedPwd, setSavedPwd] = useState(false)
  const [errPwd, setErrPwd] = useState('')

  const [form, setForm] = useState({ name: '', email: '', slug: '', logo_url: '' })
  const [pwd, setPwd] = useState({ new: '', confirm: '' })

  useEffect(() => {
    (async () => {
      const { data: agency } = await supabase.from('agencies').select('*').eq('id', agencyId).maybeSingle()
      if (agency) setForm({ name: agency.name || '', email: agency.email || userEmail, slug: agency.slug || '', logo_url: agency.logo_url || '' })
      else setForm(p => ({ ...p, email: userEmail }))
      setLoading(false)
    })()
  }, [agencyId, userEmail])

  function toSlug(str: string) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function saveAgency() {
    if (!form.name) return
    setSaving(true)
    const { error } = await supabase.from('agencies').upsert({
      id: agencyId, name: form.name, email: form.email, slug: toSlug(form.slug || form.name), logo_url: form.logo_url || null,
    })
    if (error) alert('Erro ao salvar dados.')
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  async function savePassword() {
    setErrPwd('')
    if (pwd.new !== pwd.confirm) { setErrPwd('As senhas não coincidem'); return }
    if (pwd.new.length < 6) { setErrPwd('Mínimo 6 caracteres'); return }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: pwd.new })
    if (error) { setErrPwd(error.message); setSavingPwd(false); return }
    setSavedPwd(true); setPwd({ new: '', confirm: '' }); setTimeout(() => setSavedPwd(false), 2500); setSavingPwd(false)
  }

  async function logout() { await supabase.auth.signOut(); router.push('/') }

  if (loading) return <div className={s.empty}>Carregando…</div>

  return (
    <>
      <div className={s.pageHead}>
        <div>
          <div className={s.greet}>Configurações</div>
          <div className={s.pageSub}>Dados da agência e da sua conta</div>
        </div>
      </div>

      {/* DADOS DA AGÊNCIA */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Dados da agência</div>
        <div className={styles.cardBody}>
          {!isOwner && <div className={styles.hint}>Apenas o Dono da agência pode editar estes dados.</div>}
          <div className={s.field}><label>Nome da agência</label>
            <input disabled={!isOwner} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Agência Flip" /></div>
          <div className={s.field}><label>Slug (link dos clientes)</label>
            <input disabled={!isOwner} value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="ex: agencia-flip" />
            <div className={styles.hint}>Link do cliente: /c/<strong>{toSlug(form.slug || form.name) || 'seu-slug'}</strong>/nome-do-cliente</div></div>
          <div className={s.field}><label>Logo (URL da imagem)</label>
            <input disabled={!isOwner} value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://…" /></div>
        </div>
        {isOwner && (
          <div className={styles.cardFoot}>
            <button className="btnGrad" onClick={saveAgency} disabled={saving}>{saved ? '✓ Salvo!' : saving ? 'Salvando…' : 'Salvar dados'}</button>
          </div>
        )}
      </div>

      {/* TROCAR SENHA */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Trocar senha</div>
        <div className={styles.cardBody}>
          <div className={s.field}><label>Nova senha</label>
            <input type="password" value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} placeholder="••••••••" /></div>
          <div className={s.field}><label>Confirmar nova senha</label>
            <input type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" /></div>
          {errPwd && <div className={styles.err}>{errPwd}</div>}
        </div>
        <div className={styles.cardFoot}>
          <button className="btnGrad" onClick={savePassword} disabled={savingPwd}>{savedPwd ? '✓ Senha alterada!' : savingPwd ? 'Salvando…' : 'Trocar senha'}</button>
        </div>
      </div>

      {/* SAIR */}
      <div className={styles.card} style={{ borderColor: 'var(--red-bg)' }}>
        <div className={styles.cardTitle} style={{ color: 'var(--red)' }}>Sair da conta</div>
        <div className={styles.cardBody}>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Você será redirecionado para a tela de login.</p>
        </div>
        <div className={styles.cardFoot}>
          <button className={styles.btnDanger} onClick={logout}>Sair da conta</button>
        </div>
      </div>
    </>
  )
}
