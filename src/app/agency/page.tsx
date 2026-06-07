'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Client, Revision } from '@/lib/types'
import styles from './agency.module.css'

export default function AgencyPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [agencyId, setAgencyId] = useState('')
  const [agencySlug, setAgencySlug] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setAgencyId(user.id)

    const { data: agency } = await supabase
      .from('agencies').select('slug').eq('id', user.id).single()
    if (agency) setAgencySlug(agency.slug)

    const { data: clientsData } = await supabase
      .from('clients').select('*').eq('agency_id', user.id).order('created_at', { ascending: false })
    setClients(clientsData || [])

    // busca alterações abertas de todos os clientes
    const ids = (clientsData || []).map(c => c.id)
    if (ids.length > 0) {
      const { data: revData } = await supabase
        .from('revisions').select('*').in('client_id', ids).neq('status', 'done').order('created_at', { ascending: false })
      setRevisions(revData || [])
    }
    setLoading(false)
  }

  function toSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function createClient() {
    if (!form.name.trim()) return
    setSaving(true)
    const slug = toSlug(form.name)
    const { data, error } = await supabase.from('clients').insert({
      agency_id: agencyId,
      name: form.name,
      slug,
      phone: form.phone || null,
      email: form.email || null,
    }).select().single()
    if (!error && data) {
      setClients(prev => [data, ...prev])
      setModal(false)
      setForm({ name: '', phone: '', email: '' })
    }
    setSaving(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('')
  }

  function clientLink(client: Client) {
    return `${window.location.origin}/c/${agencySlug}/${client.slug}`
  }

  function copyLink(client: Client) {
    navigator.clipboard.writeText(clientLink(client))
  }

  if (loading) return <div className={styles.loading}>Carregando...</div>

  return (
    <div className={styles.app}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sLogo}>
          <div className={styles.sLogoTop}>Deliver</div>
          <div className={styles.sLogoName}>Painel da agência</div>
        </div>
        <nav className={styles.sNav}>
          <div className={styles.navItem} data-active="true">
            <span>👥</span> Clientes
          </div>
          <div className={styles.navItem} onClick={() => router.push('/agency/revisions')}>
            <span>✏️</span> Alterações
            {revisions.length > 0 && <span className={styles.badge}>{revisions.length}</span>}
          </div>
        </nav>
        <div className={styles.sFoot}>
          <button className={styles.logoutBtn} onClick={logout}>Sair</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        <div className={styles.pageHead}>
          <div>
            <div className={styles.pageTitle}>Clientes</div>
            <div className={styles.pageSub}>{clients.length} clientes cadastrados</div>
          </div>
          <button className={styles.btnPrimary} onClick={() => setModal(true)}>
            + Novo cliente
          </button>
        </div>

        {/* STATS */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Total</div>
            <div className={styles.statVal}>{clients.length}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Alterações abertas</div>
            <div className={styles.statVal}>{revisions.length}</div>
          </div>
        </div>

        {/* LIST */}
        <div className={styles.clientList}>
          {clients.map(client => (
            <div key={client.id} className={styles.clientCard}>
              <div className={styles.cAvatar}>{getInitials(client.name)}</div>
              <div className={styles.cInfo}>
                <div className={styles.cName}>{client.name}</div>
                <div className={styles.cMeta}>
                  {client.phone || client.email || 'Sem contato cadastrado'}
                </div>
              </div>
              <button className={styles.btnCopy} onClick={() => copyLink(client)}>
                Copiar link
              </button>
              <button
                className={styles.btnDetail}
                onClick={() => router.push(`/agency/client/${client.id}`)}
              >
                Abrir →
              </button>
            </div>
          ))}

          {clients.length === 0 && (
            <div className={styles.empty}>
              Nenhum cliente ainda. Crie o primeiro!
            </div>
          )}
        </div>
      </main>

      {/* MODAL NOVO CLIENTE */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>Novo cliente</span>
              <button className={styles.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fGroup}>
                <label>Nome do cliente</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Barbearia do João"
                />
              </div>
              <div className={styles.fGroup}>
                <label>WhatsApp</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(41) 99999-0000"
                />
              </div>
              <div className={styles.fGroup}>
                <label>Email (opcional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.btnCancel} onClick={() => setModal(false)}>Cancelar</button>
              <button className={styles.btnSave} onClick={createClient} disabled={saving}>
                {saving ? 'Criando...' : 'Criar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
