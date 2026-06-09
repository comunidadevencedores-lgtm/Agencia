'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', name: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('admin_users').select('*').order('created_at')
    setAdmins(data || [])
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function addAdmin() {
    if (!form.email) return
    setSaving(true)
    const { error } = await supabase.from('admin_users').insert({ email: form.email.trim(), name: form.name })
    if (error) { showToast('Erro: ' + error.message); setSaving(false); return }
    setModal(false)
    setForm({ email: '', name: '' })
    showToast('Admin adicionado! Crie o usuário no Supabase Auth também.')
    load()
    setSaving(false)
  }

  async function removeAdmin(id: string, email: string) {
    if (email === 'vhbdavic@gmail.com') { showToast('Não é possível remover o admin principal'); return }
    await supabase.from('admin_users').delete().eq('id', id)
    setAdmins(prev => prev.filter(a => a.id !== id))
    showToast('Admin removido')
  }

  return (
    <div>
      <div className={styles.pageHead}>
        <div><div className={styles.pageTitle}>Admins</div><div className={styles.pageSub}>Usuários com acesso ao painel admin</div></div>
        <button className={styles.btnPrimary} onClick={() => setModal(true)}>+ Novo admin</button>
      </div>

      <div className={styles.tbl}>
        {admins.length === 0 && <div className={styles.empty}>Nenhum admin cadastrado.</div>}
        {admins.map(a => (
          <div key={a.id} className={styles.tblRow} style={{ gridTemplateColumns: '1fr 160px 80px' }}>
            <div>
              <div className={styles.name}>{a.name || '—'}</div>
              <div className={styles.sub}>{a.email}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
            <div>
              {a.email !== 'vhbdavic@gmail.com'
                ? <button className={`${styles.btnXs} ${styles.btnDanger}`} onClick={() => removeAdmin(a.id, a.email)}>Remover</button>
                : <span style={{ fontSize: 11, color: 'var(--text3)' }}>Principal</span>
              }
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: 'var(--amber-bg)', border: '0.5px solid var(--amber)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--amber)' }}>
        ⚠ Após adicionar um admin aqui, crie o usuário no Supabase → Authentication → Users com o mesmo email.
      </div>

      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>Novo admin</span>
              <button className={styles.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fGroup}><label className={styles.fLabel}>Nome</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: João Silva" /></div>
              <div className={styles.fGroup}><label className={styles.fLabel}>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" /></div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.btnCancel} onClick={() => setModal(false)}>Cancelar</button>
              <button className={styles.btnSave} onClick={addAdmin} disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`${styles.toast} ${styles.toastShow}`}>✓ {toast}</div>}
    </div>
  )
}
