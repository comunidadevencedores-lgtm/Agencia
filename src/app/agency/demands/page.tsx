
Ative notificações no navegador quando as tarefas forem concluídas.


Iniciar teste gratuito

Compartilhar
vai bloquar vc me manda eu faço as alterações
Lite
Entendo! Notei que eu já consegui realizar o push com sucesso para o seu repositório (branch main), mas vou te enviar aqui o bloco de código corrigido para que você possa conferir ou aplicar manualmente se preferir.
O erro acontecia porque o arquivo src/app/agency/demands/page.tsx estava com tags órfãs: ele tinha um </aside> e um </div> no final, mas faltavam as tags de abertura da estrutura do painel.
Aqui está o trecho do return corrigido:
TSX
  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.sLogo}>
          <div className={styles.sLogoTop}>Deliver</div>
          <div className={styles.sLogoName}>Painel da agência</div>
        </div>
        <nav className={styles.sNav}>
          <div className={styles.navItem} onClick={() => router.push('/agency')}>
            <span>👥</span> Clientes
          </div>
          <div className={styles.navItem} data-active="true">
            <span>📋</span> Demandas
          </div>
          <div className={styles.navItem} onClick={() => router.push('/agency/revisions')}>
            <span>✏️</span> Alterações
          </div>
          <div className={styles.navItem} onClick={() => router.push('/agency/settings')}>
            <span>⚙️</span> Configurações
          </div>
        </nav>
        <div className={styles.sFoot}>
          <button className={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Sair</button>
        </div>
      </aside>

      <main className={styles.main}>
        {/* Restante do conteúdo do main... */}
Como o commit já foi enviado, a Vercel deve iniciar um novo build automaticamente agora. Se precisar de mais alguma coisa, é só chamar!
manda o arquivo inteiro
Lite
Com certeza! Aqui está o conteúdo completo e corrigido do arquivo src/app/agency/demands/page.tsx.
Note que restaurei a estrutura da sidebar para manter a consistência com o restante do painel da agência, garantindo que o layout não quebre e o erro de compilação da Vercel seja resolvido.
Lite
Aqui está o arquivo completo e corrigido. O código abaixo restaura toda a estrutura necessária da sidebar e do layout principal, resolvendo o erro de compilação da Vercel.
page.tsx
Código · 8.93 KB
Ver todos os arquivos nesta tarefa
Tarefa concluída
Como foi este resultado?
Sugestões de acompanhamento
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../agency.module.css'
import dStyles from './demands.module.


GitHubInstagramMeta Ads Manager
+1

Computadores na nuvem
Novo

page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../agency.module.css'
import dStyles from './demands.module.css'

export default function DemandsPage() {
  const router = useRouter()
  const [demands, setDemands] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ client_id: '', title: '', total: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [agencyId, setAgencyId] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setAgencyId(user.id)

    const { data: cl } = await supabase.from('clients').select('id, name').eq('agency_id', user.id)
    setClients(cl || [])

    const { data: dm } = await supabase.from('demands')
      .select('*, clients(name)')
      .eq('agency_id', user.id)
      .order('deadline', { ascending: true })

    // conta vídeos entregues por demanda via client_id
    const enriched = await Promise.all((dm || []).map(async d => {
      const { data: proj } = await supabase.from('projects').select('id').eq('client_id', d.client_id)
      const projIds = (proj || []).map(p => p.id)
      let delivered = 0
      if (projIds.length > 0) {
        const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).in('project_id', projIds)
        delivered = count || 0
      }
      return { ...d, delivered, remaining: Math.max(0, d.total - delivered) }
    }))

    setDemands(enriched)
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function createDemand() {
    if (!form.client_id || !form.total) return
    setSaving(true)
    await supabase.from('demands').insert({
      agency_id: agencyId,
      client_id: form.client_id,
      title: form.title || 'Demanda mensal',
      total: Number(form.total),
      deadline: form.deadline || null,
    })
    setModal(false)
    setForm({ client_id: '', title: '', total: '', deadline: '' })
    showToast('Demanda criada!')
    load()
    setSaving(false)
  }

  async function deleteDemand(id: string) {
    await supabase.from('demands').delete().eq('id', id)
    setDemands(prev => prev.filter(d => d.id !== id))
    showToast('Demanda removida')
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

  if (loading) return <div className={styles.loading}>Carregando...</div>

  const pending = demands.filter(d => d.remaining > 0).length

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.sLogo}>
          <div className={styles.sLogoTop}>Deliver</div>
          <div className={styles.sLogoName}>Painel da agência</div>
        </div>
        <nav className={styles.sNav}>
          <div className={styles.navItem} onClick={() => router.push('/agency')}>
            <span>👥</span> Clientes
          </div>
          <div className={styles.navItem} data-active="true">
            <span>📋</span> Demandas
          </div>
          <div className={styles.navItem} onClick={() => router.push('/agency/revisions')}>
            <span>✏️</span> Alterações
          </div>
          <div className={styles.navItem} onClick={() => router.push('/agency/settings')}>
            <span>⚙️</span> Configurações
          </div>
        </nav>
        <div className={styles.sFoot}>
          <button className={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Sair</button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.pageHead}>
          <div>
            <div className={styles.pageTitle}>Demandas</div>
            <div className={styles.pageSub}>{pending} pendentes de entrega</div>
          </div>
          <button className={styles.btnPrimary} onClick={() => setModal(true)}>+ Nova demanda</button>
        </div>

        {demands.length === 0 && <div className={styles.empty}>Nenhuma demanda ainda. Crie a primeira!</div>}

        {demands.map(d => {
          const pct = d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0
          return (
            <div key={d.id} className={`${dStyles.card} ${urgencyClass(d)}`}>
              <div className={dStyles.cardTop}>
                <div className={dStyles.clientName}>{d.clients?.name || '—'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {urgencyLabel(d) && (
                    <span className={`${dStyles.urgTag} ${d.remaining === 0 ? dStyles.tagDone : urgencyClass(d) === dStyles.urgent ? dStyles.tagUrgent : urgencyClass(d) === dStyles.warn ? dStyles.tagWarn : dStyles.tagOk}`}>
                      {urgencyLabel(d)}
                    </span>
                  )}
                  <button className={styles.btnCopy} onClick={() => deleteDemand(d.id)} style={{ color: 'var(--red)', borderColor: 'transparent', fontSize: 11 }}>Remover</button>
                </div>
              </div>
              <div className={dStyles.cardTitle}>{d.title}</div>
              {d.deadline && <div className={dStyles.deadline}>Prazo: {new Date(d.deadline).toLocaleDateString('pt-BR')}</div>}
              <div className={dStyles.progressRow}>
                <div className={dStyles.progressBar}>
                  <div className={dStyles.progressFill} style={{ width: `${pct}%`, background: d.remaining === 0 ? 'var(--green)' : urgencyClass(d) === dStyles.urgent ? 'var(--red)' : urgencyClass(d) === dStyles.warn ? 'var(--amber)' : 'var(--blue)' }} />
                </div>
                <div className={dStyles.progressText}>
                  <span style={{ color: 'var(--text2)' }}>{d.delivered} de {d.total} entregues</span>
                  {d.remaining > 0 && <span style={{ color: 'var(--text3)' }}>· faltam {d.remaining}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>Nova demanda</span>
              <button className={styles.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fGroup}>
                <label>Cliente</label>
                <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.fGroup}>
                <label>Descrição</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Reels de Junho" />
              </div>
              <div className={styles.fGroup}>
                <label>Total de vídeos</label>
                <input type="number" value={form.total} onChange={e => setForm(p => ({ ...p, total: e.target.value }))} placeholder="Ex: 8" min="1" />
              </div>
              <div className={styles.fGroup}>
                <label>Prazo</label>
                <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.btnCancel} onClick={() => setModal(false)}>Cancelar</button>
              <button className={styles.btnSave} onClick={createDemand} disabled={saving}>{saving ? 'Salvando...' : 'Criar demanda'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', bottom: 14, right: 14, background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: 'var(--text)', zIndex: 200 }}>✓ {toast}</div>}
    </div>
  )
}
Next.js Build Failed Due to Unexpected Token Error - Manus
