'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/types'
import { GradientAvatar } from '@/components/GradientAvatar'
import { useAgency } from '../agency-context'
import s from '../pages.module.css'

export default function ClientsPage() {
  const router = useRouter()
  const { agencyId, agencySlug, canEdit, refresh } = useAgency()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }, [agencyId])

  useEffect(() => { load() }, [load])

  function toSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function createClient() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('clients').insert({
      agency_id: agencyId, name: form.name, slug: toSlug(form.name),
      phone: form.phone || null, email: form.email || null,
    }).select().single()
    if (error) {
      alert(error.code === '23505' ? 'Já existe um cliente com esse nome.' : `Erro: ${error.message}`)
    } else if (data) {
      setClients(prev => [data, ...prev]); setModal(false); setForm({ name: '', phone: '', email: '' }); refresh()
    }
    setSaving(false)
  }

  async function removeClient(c: Client) {
    if (!confirm(`Remover o cliente "${c.name}"? Isso apaga projetos, vídeos e alterações dele.`)) return
    await supabase.from('clients').delete().eq('id', c.id)
    setClients(prev => prev.filter(x => x.id !== c.id)); refresh()
    setToast('Cliente removido'); fade()
  }

  function copyLink(c: Client) {
    if (!agencySlug) { setToast('Configure o slug em Configurações'); fade(); return }
    navigator.clipboard.writeText(`${window.location.origin}/c/${agencySlug}/${c.slug}`)
    setToast('Link copiado!'); fade()
  }
  function fade() { setTimeout(() => setToast(''), 2500) }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className={s.pageHead}>
        <div>
          <div className={s.greet}>Clientes</div>
          <div className={s.pageSub}>{clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}</div>
        </div>
        {canEdit && (
          <button className="btnGrad" onClick={() => setModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Novo cliente
          </button>
        )}
      </div>

      <div className={s.sectionBar}>
        <div className={s.search}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input className={s.searchInput} placeholder="Buscar clientes…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className={s.panel}>
        {loading && <div className={s.empty} style={{ border: 'none' }}>Carregando…</div>}
        {!loading && filtered.length === 0 && (
          <div className={s.empty} style={{ border: 'none' }}>{search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda.'}</div>
        )}
        {filtered.map(c => (
          <div key={c.id} className={s.row}>
            <GradientAvatar name={c.name} size={40} />
            <div className={s.rowMain}>
              <div className={s.rowName}>{c.name}</div>
              <div className={s.rowMeta}>{c.phone || c.email || 'Sem contato cadastrado'}</div>
            </div>
            <button className={s.btnOutline} onClick={() => copyLink(c)}>Copiar link</button>
            <button className="btnGrad" onClick={() => router.push(`/agency/client/${c.id}`)}>Abrir</button>
            {canEdit && <button className={s.btnDanger} onClick={() => removeClient(c)}>Remover</button>}
          </div>
        ))}
      </div>

      {modal && (
        <div className={s.modalOverlay} onClick={() => setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <span className={s.modalTitle}>Novo cliente</span>
              <button className={s.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.field}><label>Nome do cliente</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Barbearia Imperium" /></div>
              <div className={s.field}><label>WhatsApp</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(41) 99999-0000" /></div>
              <div className={s.field}><label>Email (opcional)</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="cliente@email.com" /></div>
            </div>
            <div className={s.modalFoot}>
              <button className={s.btnOutline} onClick={() => setModal(false)}>Cancelar</button>
              <button className="btnGrad" onClick={createClient} disabled={saving}>{saving ? 'Criando…' : 'Criar cliente'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={s.toast}>✓ {toast}</div>}
    </>
  )
}
