'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GradientAvatar } from '@/components/GradientAvatar'
import { useAgency, ROLE_LABEL, type Role } from '../agency-context'
import s from '../pages.module.css'

type Member = { id: string; user_id: string; name: string; email: string; role: Role; created_at: string }

const ROLE_DESC: Record<Exclude<Role, 'owner'>, string> = {
  editor: 'Gerencia clientes, demandas e alterações.',
  viewer: 'Apenas visualiza os dados, sem editar.',
}

export default function TeamPage() {
  const { agencyId, isOwner, userName, userEmail } = useAgency()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'editor' as Exclude<Role, 'owner'> })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('agency_members').select('*').eq('agency_id', agencyId).order('created_at', { ascending: true })
    if (!error) setMembers(data || [])
    setLoading(false)
  }, [agencyId])

  useEffect(() => { load() }, [load])

  function fade() { setTimeout(() => setToast(''), 2800) }

  async function addMember() {
    setErr('')
    if (!form.email.trim() || form.password.length < 6) { setErr('Email válido e senha de 6+ caracteres.'); return }
    
    setSaving(true)
    try {
      // Obtém a sessão e valida que existe
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setErr('Sua sessão expirou. Por favor, recarregue a página.')
        setSaving(false)
        return
      }

      // Faz a requisição com o token válido
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(form),
      })
      
      const json = await res.json()
      
      if (!res.ok) { 
        setErr(json.error || 'Erro ao criar usuário')
        setSaving(false)
        return 
      }

      // Sucesso! Atualiza a lista e limpa o modal
      setMembers(prev => [...prev, json.member])
      setModal(false)
      setForm({ name: '', email: '', password: '', role: 'editor' })
      setToast('Usuário criado com sucesso!')
      fade()
    } catch (e: any) {
      setErr(e?.message || 'Erro inesperado ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  async function removeMember(m: Member) {
    if (!confirm(`Remover o acesso de ${m.name}? A conta de login será excluída.`)) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setToast('Sua sessão expirou. Por favor, recarregue.')
        fade()
        return
      }

      const res = await fetch(`/api/team?user_id=${m.user_id}`, {
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      
      if (!res.ok) { 
        const j = await res.json()
        setToast(j.error || 'Erro ao remover') 
        fade()
        return 
      }

      setMembers(prev => prev.filter(x => x.user_id !== m.user_id))
      setToast('Acesso removido com sucesso')
      fade()
    } catch (e: any) {
      setToast(e?.message || 'Erro ao remover usuário')
      fade()
    }
  }

  function roleTag(role: Role) {
    const bg = role === 'owner' ? 'var(--brand-bg)' : role === 'editor' ? 'var(--green-bg)' : 'var(--bg4)'
    const color = role === 'owner' ? 'var(--brand)' : role === 'editor' ? 'var(--green)' : 'var(--text2)'
    return <span className={s.tag} style={{ background: bg, color }}>{ROLE_LABEL[role]}</span>
  }

  return (
    <>
      <div className={s.pageHead}>
        <div>
          <div className={s.greet}>Equipe</div>
          <div className={s.pageSub}>Pessoas com acesso ao painel da sua agência</div>
        </div>
        {isOwner && (
          <button className="btnGrad" onClick={() => { setErr(''); setModal(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Adicionar usuário
          </button>
        )}
      </div>

      {!isOwner && (
        <div className={s.empty} style={{ marginBottom: 20, padding: '16px 20px', textAlign: 'left' }}>
          Somente o <strong style={{ color: 'var(--text)' }}>Dono</strong> da agência pode adicionar ou remover usuários.
        </div>
      )}

      <div className={s.panel}>
        {/* Dono (você) */}
        <div className={s.row}>
          <GradientAvatar name={userName} size={40} />
          <div className={s.rowMain}>
            <div className={s.rowName}>{userName} {isOwner && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(você)</span>}</div>
            <div className={s.rowMeta}>{userEmail}</div>
          </div>
          {roleTag('owner')}
        </div>

        {loading && <div className={s.empty} style={{ border: 'none' }}>Carregando…</div>}
        {members.map(m => (
          <div key={m.id} className={s.row}>
            <GradientAvatar name={m.name} size={40} />
            <div className={s.rowMain}>
              <div className={s.rowName}>{m.name}</div>
              <div className={s.rowMeta}>{m.email} · {ROLE_DESC[m.role as Exclude<Role, 'owner'>] || ''}</div>
            </div>
            {roleTag(m.role)}
            {isOwner && <button className={s.btnDanger} onClick={() => removeMember(m)}>Remover</button>}
          </div>
        ))}
        {!loading && members.length === 0 && (
          <div className={s.empty} style={{ border: 'none' }}>Nenhum membro adicional. {isOwner && 'Adicione o primeiro!'}</div>
        )}
      </div>

      {modal && (
        <div className={s.modalOverlay} onClick={() => setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <span className={s.modalTitle}>Adicionar usuário</span>
              <button className={s.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.field}><label>Nome</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: João Editor" /></div>
              <div className={s.field}><label>Email de acesso</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" /></div>
              <div className={s.field}><label>Senha provisória</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
              <div className={s.field}><label>Nível de acesso</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as any }))}>
                  <option value="editor">Editor — gerencia tudo</option>
                  <option value="viewer">Visualização — só leitura</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{ROLE_DESC[form.role]}</div></div>
              {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}
            </div>
            <div className={s.modalFoot}>
              <button className={s.btnOutline} onClick={() => setModal(false)}>Cancelar</button>
              <button className="btnGrad" onClick={addMember} disabled={saving}>{saving ? 'Criando…' : 'Criar acesso'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={s.toast}>✓ {toast}</div>}
    </>
  )
}