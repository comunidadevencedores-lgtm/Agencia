'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAgency } from '../agency-context'
import s from '../pages.module.css'
import dStyles from './demands.module.css'

export default function DemandsPage() {
  const { agencyId, canEdit, refresh } = useAgency()
  const [demands, setDemands] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ client_id: '', title: '', total: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const { data: cl } = await supabase.from('clients').select('id, name').eq('agency_id', agencyId)
    setClients(cl || [])
    const { data: dm } = await supabase.from('demands').select('*, clients(name)').eq('agency_id', agencyId).order('deadline', { ascending: true })
    const enriched = await Promise.all((dm || []).map(async d => {
      const { data: proj } = await supabase.from('projects').select('id').eq('client_id', d.client_id)
      const projIds = (proj || []).map((p: any) => p.id)
      let delivered = 0
      if (projIds.length > 0) {
        const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).in('project_id', projIds)
        delivered = count || 0
      }
      return { ...d, delivered, remaining: Math.max(0, d.total - delivered) }
    }))
    setDemands(enriched)
    setLoading(false)
  }, [agencyId])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  async function createDemand() {
    if (!form.client_id || !form.total) return
    setSaving(true)
    await supabase.from('demands').insert({
      agency_id: agencyId, client_id: form.client_id,
      title: form.title || 'Demanda mensal', total: Number(form.total), deadline: form.deadline || null,
    })
    setModal(false); setForm({ client_id: '', title: '', total: '', deadline: '' })
    showToast('Demanda criada!'); load(); refresh(); setSaving(false)
  }

  async function deleteDemand(id: string) {
    await supabase.from('demands').delete().eq('id', id)
    setDemands(prev => prev.filter(d => d.id !== id)); refresh(); showToast('Demanda removida')
  }

  function urgencyClass(d: any) {
    if (d.remaining === 0) return dStyles.done
    if (!d.deadline) return ''
    const days = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / 86400000)
    if (days <= 3) return dStyles.urgent
    if (days <= 7) return dStyles.warn
    return ''
  }
  function urgencyLabel(d: any) {
    if (d.remaining === 0) return 'Concluído'
    if (!d.deadline) return ''
    const days = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / 86400000)
    if (days < 0) return 'Atrasado!'
    if (days === 0) return 'Vence hoje!'
    if (days === 1) return 'Vence amanhã'
    return `${days} dias`
  }

  const pending = demands.filter(d => d.remaining > 0).length

  return (
    <>
      <div className={s.pageHead}>
        <div>
          <div className={s.greet}>Demandas</div>
          <div className={s.pageSub}>{pending} pendentes de entrega</div>
        </div>
        {canEdit && (
          <button className="btnGrad" onClick={() => setModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nova demanda
          </button>
        )}
      </div>

      {loading && <div className={s.empty}>Carregando…</div>}
      {!loading && demands.length === 0 && <div className={s.empty}>Nenhuma demanda ainda.</div>}

      {demands.map(d => {
        const pct = d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0
        const uc = urgencyClass(d)
        return (
          <div key={d.id} className={`${dStyles.card} ${uc}`}>
            <div className={dStyles.cardTop}>
              <div className={dStyles.clientName}>{d.clients?.name || '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {urgencyLabel(d) && (
                  <span className={`${dStyles.urgTag} ${d.remaining === 0 ? dStyles.tagDone : uc === dStyles.urgent ? dStyles.tagUrgent : uc === dStyles.warn ? dStyles.tagWarn : dStyles.tagOk}`}>
                    {urgencyLabel(d)}
                  </span>
                )}
                {canEdit && <button className={s.btnDanger} onClick={() => deleteDemand(d.id)}>Remover</button>}
              </div>
            </div>
            <div className={dStyles.cardTitle}>{d.title}</div>
            {d.deadline && <div className={dStyles.deadline}>Prazo: {new Date(d.deadline).toLocaleDateString('pt-BR')}</div>}
            <div className={dStyles.progressRow}>
              <div className={dStyles.progressBar}>
                <div className={dStyles.progressFill} style={{ width: `${pct}%`, background: d.remaining === 0 ? 'var(--green)' : uc === dStyles.urgent ? 'var(--red)' : uc === dStyles.warn ? 'var(--amber)' : 'var(--brand)' }} />
              </div>
              <div className={dStyles.progressText}>
                <span style={{ color: 'var(--text2)' }}>{d.delivered} de {d.total} entregues</span>
                {d.remaining > 0 && <span style={{ color: 'var(--text3)' }}>· faltam {d.remaining}</span>}
              </div>
            </div>
          </div>
        )
      })}

      {modal && (
        <div className={s.modalOverlay} onClick={() => setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <span className={s.modalTitle}>Nova demanda</span>
              <button className={s.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.field}><label>Cliente</label>
                <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                  <option value="">Selecione…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div className={s.field}><label>Descrição</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Reels de Junho" /></div>
              <div className={s.field}><label>Total de vídeos</label>
                <input type="number" min="1" value={form.total} onChange={e => setForm(p => ({ ...p, total: e.target.value }))} placeholder="Ex: 8" /></div>
              <div className={s.field}><label>Prazo</label>
                <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} /></div>
            </div>
            <div className={s.modalFoot}>
              <button className={s.btnOutline} onClick={() => setModal(false)}>Cancelar</button>
              <button className="btnGrad" onClick={createDemand} disabled={saving}>{saving ? 'Salvando…' : 'Criar demanda'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={s.toast}>✓ {toast}</div>}
    </>
  )
}
