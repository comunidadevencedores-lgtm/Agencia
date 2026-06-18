'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/types'
import { GradientAvatar } from '@/components/GradientAvatar'
import { useAgency } from './agency-context'
import s from './pages.module.css'

type ClientStat = Client & { demands: number; revisions: number }

export default function OverviewPage() {
  const router = useRouter()
  const { agencyId, agencySlug, userName, canEdit, counts, refresh } = useAgency()

  const [clients, setClients] = useState<ClientStat[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const { data: clientsData } = await supabase
      .from('clients').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false })
    const list = clientsData || []
    const ids = list.map(c => c.id)
    let revs: any[] = []
    let dems: any[] = []
    if (ids.length) {
      const { data: r } = await supabase.from('revisions').select('client_id, status').in('client_id', ids).neq('status', 'done')
      revs = r || []
      const { data: d } = await supabase.from('demands').select('client_id').eq('agency_id', agencyId)
      dems = d || []
    }
    setClients(list.map(c => ({
      ...c,
      demands: dems.filter(d => d.client_id === c.id).length,
      revisions: revs.filter(r => r.client_id === c.id).length,
    })))
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
      setClients(prev => [{ ...data, demands: 0, revisions: 0 }, ...prev])
      setModal(false); setForm({ name: '', phone: '', email: '' }); refresh()
    }
    setSaving(false)
  }

  function copyLink(c: Client) {
    if (!agencySlug) { setToast('Configure o slug da agência em Configurações'); fade(); return }
    navigator.clipboard.writeText(`${window.location.origin}/c/${agencySlug}/${c.slug}`)
    setToast('Link copiado!'); fade()
  }
  function fade() { setTimeout(() => setToast(''), 2500) }

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  }, [])

  const filtered = useMemo(() => {
    let list = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [clients, search, sort])

  const stats = [
    { label: 'Clientes ativos', val: counts.clients, sub: 'Total cadastrado', icon: '👥', bg: 'var(--brand-bg)' },
    { label: 'Demandas totais', val: counts.demandsPending, sub: 'Em acompanhamento', icon: '📋', bg: 'var(--amber-bg)' },
    { label: 'Alterações abertas', val: counts.revisionsOpen, sub: counts.revisionsOpen ? 'Aguardando resposta' : 'Nenhuma pendência', icon: '✏️', bg: 'var(--red-bg)' },
    { label: 'Receita mensal', val: 'R$ 0', sub: 'Configure valores', icon: '💰', bg: 'var(--green-bg)' },
  ]

  return (
    <>
      <div className={s.pageHead}>
        <div>
          <div className={s.greet}>{greeting}, {userName} 👋</div>
          <div className={s.pageSub}>Aqui está o resumo da sua agência.</div>
        </div>
        <div className={s.headActions}>
          <button className={s.iconBtn} title="Notificações">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            {counts.revisionsOpen > 0 && <span className={s.notifDot} />}
          </button>
          {canEdit && (
            <button className="btnGrad" onClick={() => setModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Novo cliente
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className={s.statsRow}>
        {stats.map((st, i) => (
          <div key={i} className={s.statCard}>
            <div className={s.statTop}>
              <span className={s.statLabel}>{st.label}</span>
              <span className={s.statIcon} style={{ background: st.bg }}>{st.icon}</span>
            </div>
            <div className={s.statVal}>{st.val}</div>
            <div className={s.statSub}>{st.sub}</div>
          </div>
        ))}
      </div>

      {/* MEUS CLIENTES */}
      <div className={s.sectionBar}>
        <span className={s.sectionTitle}>Meus clientes</span>
        <div className={s.toolbar}>
          <div className={s.search}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input className={s.searchInput} placeholder="Buscar clientes…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={s.select} value={sort} onChange={e => setSort(e.target.value as any)}>
            <option value="recent">Mais recentes</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        </div>
      </div>

      <div className={s.clientGrid}>
        {loading && <div className={s.empty}>Carregando clientes…</div>}
        {!loading && filtered.length === 0 && (
          <div className={s.empty}>{search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Crie o primeiro!'}</div>
        )}
        {filtered.map(c => (
          <div key={c.id} className={s.clientCard}>
            <div className={s.cardBanner} />
            <div className={s.cardBody}>
              <div className={s.cardIdentity}>
                <GradientAvatar name={c.name} src={null} size={52} />
                <div className={s.cardIdInfo} style={{ flex: 1 }}>
                  <div className={s.cardName}>{c.name}</div>
                  <div className={s.cardSub}>{c.phone || c.email || 'Sem contato'}</div>
                </div>
                <span className={`${s.tag} ${s.tagActive}`}>Ativo</span>
              </div>

              <div className={s.cardStats}>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal} data-warn={c.demands > 0}>{c.demands}</div>
                  <div className={s.cardStatLabel}>Demandas</div>
                </div>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal} data-alert={c.revisions > 0}>{c.revisions}</div>
                  <div className={s.cardStatLabel}>Alterações</div>
                </div>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal}>{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
                  <div className={s.cardStatLabel}>Desde</div>
                </div>
              </div>

              <div className={s.cardActions}>
                <button className={`${s.btnGhost} ${s.btnGhostBrand}`} onClick={() => router.push(`/agency/client/${c.id}`)}>
                  Abrir dashboard
                </button>
                <button className={s.btnGhost} onClick={() => router.push(`/agency/client/${c.id}`)}>
                  Ver detalhes
                </button>
                <button className={`${s.btnGhost} ${s.btnSquare}`} title="Copiar link" onClick={() => copyLink(c)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOVO CLIENTE */}
      {modal && (
        <div className={s.modalOverlay} onClick={() => setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <span className={s.modalTitle}>Novo cliente</span>
              <button className={s.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.field}>
                <label>Nome do cliente</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Barbearia Imperium" />
              </div>
              <div className={s.field}>
                <label>WhatsApp</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(41) 99999-0000" />
              </div>
              <div className={s.field}>
                <label>Email (opcional)</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="cliente@email.com" />
              </div>
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
