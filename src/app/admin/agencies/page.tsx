'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

export default function AdminAgencies() {
  const router = useRouter()
  const [agencies, setAgencies] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', slug: '', plan: 'trial' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('agencies').select('*').order('created_at', { ascending: false })
    setAgencies(data || [])
  }

  function toSlug(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function createAgency() {
    if (!form.name || !form.email || !form.password) return
    setSaving(true)
    const slug = toSlug(form.slug || form.name)
    const { data: signUp, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error || !signUp?.user?.id) { setSaving(false); showToast('Erro: ' + error?.message); return }
    const { error: agencyError } = await supabase.from('agencies').insert({ id: signUp.user.id, name: form.name, email: form.email, slug, plan: form.plan, status: 'active' })
    if (agencyError) { setSaving(false); showToast('Erro ao criar agência: ' + agencyError.message); return }

    // Insere o dono como membro da agência
    await supabase.from('agency_members').insert({
      agency_id: signUp.user.id,
      user_id: signUp.user.id,
      role: 'owner'
    })

    setModal(false)
    setForm({ name: '', email: '', password: '', slug: '', plan: 'trial' })
    showToast('Agência criada!')
    load()
    setSaving(false)
  }

  async function toggleBlock(ag: any) {
    const newStatus = ag.status === 'blocked' ? 'active' : 'blocked'
    await supabase.from('agencies').update({ status: newStatus }).eq('id', ag.id)
    setAgencies(prev => prev.map(a => a.id === ag.id ? { ...a, status: newStatus } : a))
    showToast(newStatus === 'blocked' ? 'Agência bloqueada' : 'Agência desbloqueada')
  }

  return (
    <div>
      <div className={styles.pageHead}>
        <div><div className={styles.pageTitle}>Agências</div><div className={styles.pageSub}>{agencies.length} cadastradas</div></div>
        <button className={styles.btnPrimary} onClick={() => setModal(true)}>+ Nova agência</button>
      </div>
      <div className={styles.tbl}>
        <div className={`${styles.tblHead} ${styles.ag6}`}><span>Agência</span><span>Plano</span><span>Slug</span><span>Criada</span><span>Status</span><span>Ações</span></div>
        {agencies.length === 0 && <div className={styles.empty}>Nenhuma agência ainda.</div>}
        {agencies.map(ag => (
          <div key={ag.id} className={`${styles.tblRow} ${styles.ag6}`} onClick={() => router.push(`/admin/agencies/${ag.id}`)}>
            <div><div className={styles.name}>{ag.name}</div><div className={styles.sub}>{ag.email}</div></div>
            <div><span className={`${styles.tag} ${ag.plan === 'pro' ? styles.tPro : ag.plan === 'trial' ? styles.tTrial : styles.tBasic}`}>{ag.plan || 'básico'}</span></div>
            <div style={{ color: 'var(--text2)', fontSize: 11 }}>{ag.slug}</div>
            <div style={{ color: 'var(--text2)' }}>{new Date(ag.created_at).toLocaleDateString('pt-BR')}</div>
            <div><span className={`${styles.tag} ${ag.status === 'blocked' ? styles.tBlocked : styles.tActive}`}>{ag.status === 'blocked' ? 'Bloqueado' : 'Ativo'}</span></div>
            <div className={styles.actions} onClick={e => e.stopPropagation()}>
              <button className={styles.btnXs} onClick={() => router.push(`/admin/agencies/${ag.id}`)}>Ver</button>
              <button className={`${styles.btnXs} ${ag.status === 'blocked' ? styles.btnSuccess : styles.btnDanger}`} onClick={() => toggleBlock(ag)}>
                {ag.status === 'blocked' ? 'Ativar' : 'Bloquear'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>Nova agência</span>
              <button className={styles.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fRow}>
                <div className={styles.fGroup}><label className={styles.fLabel}>Nome</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Agência XYZ" /></div>
                <div className={styles.fGroup}><label className={styles.fLabel}>Slug</label><input type="text" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="agencia-xyz" /></div>
              </div>
              <div className={styles.fGroup}><label className={styles.fLabel}>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contato@agencia.com" /></div>
              <div className={styles.fRow}>
                <div className={styles.fGroup}><label className={styles.fLabel}>Senha inicial</label><input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" /></div>
                <div className={styles.fGroup}><label className={styles.fLabel}>Plano</label>
                  <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
                    <option value="trial">Trial (14 dias)</option>
                    <option value="basic">Básico — R$97/mês</option>
                    <option value="pro">Pro — R$197/mês</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.btnCancel} onClick={() => setModal(false)}>Cancelar</button>
              <button className={styles.btnSave} onClick={createAgency} disabled={saving}>{saving ? 'Criando...' : 'Criar agência'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`${styles.toast} ${styles.toastShow}`}>✓ {toast}</div>}
    </div>
  )
}
