'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Client, Revision } from '@/lib/types'

const colors = {
  bg: '#0a0a0f',
  bg2: '#12121a',
  bg3: '#1a1a26',
  bg4: '#22223a',
  border: '#1e1e2e',
  border2: '#2a2a40',
  text: '#f0f0ff',
  text2: '#a0a0c0',
  text3: '#505070',
  accent: '#6c63ff',
  accentBg: '#1a1830',
  green: '#22c55e',
  greenBg: '#0a2018',
  amber: '#f59e0b',
  amberBg: '#1a1200',
  red: '#ef4444',
  redBg: '#1a0808',
  blue: '#3b82f6',
  blueBg: '#081428',
}

const avatarColors = [
  ['#6c63ff','#1a1830'],['#22c55e','#0a2018'],['#f59e0b','#1a1200'],
  ['#3b82f6','#081428'],['#ec4899','#1a0814'],['#14b8a6','#081418'],
]

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % avatarColors.length
  return avatarColors[idx]
}

function getInitials(name: string) {
  if (!name) return '?'
  return name.split(' ').slice(0,2).filter(w=>w).map(w=>w[0].toUpperCase()).join('')
}

export default function AgencyPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [agencyId, setAgencyId] = useState('')
  const [agencySlug, setAgencySlug] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [search, setSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setAgencyId(user.id)
    const { data: agency } = await supabase.from('agencies').select('slug, name').eq('id', user.id).single()
    if (agency) { setAgencySlug(agency.slug); setAgencyName(agency.name) }
    const { data: clientsData } = await supabase.from('clients').select('*').eq('agency_id', user.id).order('created_at', { ascending: false })
    setClients(clientsData || [])
    const ids = (clientsData || []).map((c:any) => c.id)
    if (ids.length > 0) {
      const { data: revData } = await supabase.from('revisions').select('*').in('client_id', ids).neq('status', 'done')
      setRevisions(revData || [])
      const { data: dmData } = await supabase.from('demands').select('*').in('client_id', ids)
      setDemands(dmData || [])
    }
    setLoading(false)
  }

  function toSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
  }

  async function createClient() {
    if (!form.name.trim()) return
    setSaving(true)
    const slug = toSlug(form.name)
    const { data, error } = await supabase.from('clients').insert({
      agency_id: agencyId, name: form.name, slug,
      phone: form.phone || null, email: form.email || null,
    }).select().single()
    if (!error && data) { setClients(prev => [data, ...prev]); setModal(false); setForm({ name:'', phone:'', email:'' }) }
    setSaving(false)
  }

  function clientLink(client: Client) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${agencySlug}/${client.slug}`
  }

  function copyLink(client: Client) {
    navigator.clipboard.writeText(clientLink(client))
  }

  function clientDemands(clientId: string) {
    return demands.filter(d => d.client_id === clientId).length
  }

  function clientRevisions(clientId: string) {
    return revisions.filter(r => r.client_id === clientId).length
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const totalDemands = demands.length
  const totalRevisions = revisions.length

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background: colors.bg, color: colors.text3, fontSize:13 }}>
      Carregando...
    </div>
  )

  const s: Record<string, any> = {
    app: { display:'flex', height:'100vh', background: colors.bg, color: colors.text, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize:14 },
    sidebar: { width:220, background: colors.bg2, borderRight:`0.5px solid ${colors.border}`, display:'flex', flexDirection:'column', flexShrink:0 },
    sLogoWrap: { padding:'20px 18px 16px', borderBottom:`0.5px solid ${colors.border}` },
    sLogoIcon: { width:32, height:32, borderRadius:8, background: colors.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', marginBottom:8 },
    sLogoName: { fontSize:15, fontWeight:600, color: colors.text, letterSpacing:'-0.01em' },
    sLogoPlan: { fontSize:10, color: colors.text3, marginTop:1, textTransform:'uppercase', letterSpacing:'0.08em' },
    sSection: { padding:'8px 10px 4px', fontSize:10, color: colors.text3, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:500 },
    sNav: { padding:'6px 0', flex:1 },
    navItem: { display:'flex', alignItems:'center', gap:9, padding:'8px 14px', fontSize:13, color: colors.text2, cursor:'pointer', border:'none', background:'none', width:'100%', textAlign:'left' as const, borderRadius:0, transition:'.1s' },
    navOn: { color: colors.text, background: colors.accentBg },
    navIcon: { fontSize:16, flexShrink:0, opacity:0.8 },
    navBadge: { marginLeft:'auto', background: colors.redBg, color: colors.red, fontSize:10, padding:'1px 6px', borderRadius:8, fontWeight:500 },
    navBadgeAmber: { marginLeft:'auto', background: colors.amberBg, color: colors.amber, fontSize:10, padding:'1px 6px', borderRadius:8, fontWeight:500 },
    sFooter: { padding:'12px 14px 16px', borderTop:`0.5px solid ${colors.border}` },
    sUserRow: { display:'flex', alignItems:'center', gap:8 },
    sUserAv: { width:28, height:28, borderRadius:50, background: colors.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 },
    sUserName: { fontSize:12, color: colors.text2, flex:1 },
    sLogout: { background:'none', border:'none', color: colors.text3, fontSize:11, cursor:'pointer' },
    main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    header: { padding:'14px 24px', borderBottom:`0.5px solid ${colors.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background: colors.bg2, flexShrink:0 },
    breadcrumb: { display:'flex', alignItems:'center', gap:6, fontSize:13, color: colors.text3 },
    breadcrumbCurrent: { color: colors.text, fontWeight:500 },
    headerRight: { display:'flex', alignItems:'center', gap:12 },
    searchBox: { display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background: colors.bg3, border:`0.5px solid ${colors.border2}`, borderRadius:8, fontSize:13, color: colors.text2 },
    searchInput: { background:'none', border:'none', outline:'none', fontSize:13, color: colors.text, width:180, fontFamily:'inherit' },
    headerBtn: { width:32, height:32, borderRadius:8, background: colors.bg3, border:`0.5px solid ${colors.border2}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: colors.text2, fontSize:16, position:'relative' as const },
    notifDot: { position:'absolute' as const, top:6, right:6, width:7, height:7, borderRadius:'50%', background: colors.red, border:`1.5px solid ${colors.bg2}` },
    body: { flex:1, overflow:'auto', padding:24 },
    pageHead: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 },
    pageTitle: { fontSize:22, fontWeight:600, color: colors.text, letterSpacing:'-0.02em', marginBottom:3 },
    pageSub: { fontSize:13, color: colors.text3 },
    btnPrimary: { display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background: colors.accent, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:500, cursor:'pointer' },
    statsRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 },
    statCard: { background: colors.bg2, border:`0.5px solid ${colors.border}`, borderRadius:12, padding:'14px 16px' },
    statIcon: { width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:10 },
    statLabel: { fontSize:11, color: colors.text3, marginBottom:4, textTransform:'uppercase' as const, letterSpacing:'0.06em' },
    statVal: { fontSize:24, fontWeight:600, color: colors.text, letterSpacing:'-0.02em' },
    statSub: { fontSize:11, color: colors.text3, marginTop:3 },
    searchRow: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
    clientCard: { background: colors.bg2, border:`0.5px solid ${colors.border}`, borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, marginBottom:8, transition:'.15s', cursor:'pointer' },
    cAvWrap: { width:44, height:44, borderRadius:50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, flexShrink:0 },
    cMain: { flex:1 },
    cName: { fontSize:14, fontWeight:500, color: colors.text, marginBottom:3 },
    cMeta: { display:'flex', alignItems:'center', gap:10, fontSize:12, color: colors.text3 },
    cStats: { display:'flex', gap:20 },
    cStat: { textAlign:'center' as const },
    cStatV: { fontSize:16, fontWeight:500, color: colors.text },
    cStatL: { fontSize:10, color: colors.text3, textTransform:'uppercase' as const, letterSpacing:'0.06em' },
    cActions: { display:'flex', gap:7 },
    btnSm: { width:34, height:34, borderRadius:8, background: colors.bg3, border:`0.5px solid ${colors.border2}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: colors.text2, fontSize:16 },
    btnOpen: { padding:'8px 14px', background: colors.accent, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer' },
    tag: { fontSize:10, padding:'2px 8px', borderRadius:8, fontWeight:500 },
    empty: { textAlign:'center' as const, padding:'40px', color: colors.text3, fontSize:13 },
    modalOverlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
    modal: { background: colors.bg2, border:`0.5px solid ${colors.border2}`, borderRadius:14, width:440, maxWidth:'95vw' },
    modalHead: { padding:'18px 20px 14px', borderBottom:`0.5px solid ${colors.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' },
    modalTitle: { fontSize:15, fontWeight:500, color: colors.text },
    mClose: { background:'none', border:'none', color: colors.text3, fontSize:18, cursor:'pointer' },
    modalBody: { padding:20, display:'flex', flexDirection:'column' as const, gap:14 },
    fGroup: { display:'flex', flexDirection:'column' as const, gap:5 },
    fLabel: { fontSize:11, color: colors.text3, textTransform:'uppercase' as const, letterSpacing:'0.06em' },
    fInput: { padding:'9px 12px', background: colors.bg3, border:`0.5px solid ${colors.border2}`, borderRadius:8, color: colors.text, fontSize:13, fontFamily:'inherit', outline:'none' },
    modalFoot: { padding:'14px 20px', borderBottom: `0.5px solid ${colors.border}`, display:'flex', justifyContent:'flex-end', gap:8 },
    btnCancel: { padding:'8px 14px', background:'transparent', border:`0.5px solid ${colors.border2}`, borderRadius:8, color: colors.text2, fontSize:13, cursor:'pointer' },
    btnSave: { padding:'8px 14px', background: colors.accent, border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' },
  }

  return (
    <div style={s.app}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sLogoWrap}>
          <div style={s.sLogoIcon}>D</div>
          <div style={s.sLogoName}>Deliver</div>
          <div style={s.sLogoPlan}>{agencyName || 'Agência'}</div>
        </div>
        <div style={s.sNav}>
          <div style={s.sSection}>Navegação</div>
          {[
            { label:'Overview', icon:'📊', path:'/agency', id:'overview' },
            { label:'Clientes', icon:'👥', path:'/agency', id:'clientes', active:true },
            { label:'Demandas', icon:'📋', path:'/agency/demands', id:'demands', badge: totalDemands > 0 ? totalDemands : null, badgeType:'amber' },
            { label:'Alterações', icon:'✏️', path:'/agency/revisions', id:'alts', badge: totalRevisions > 0 ? totalRevisions : null },
            { label:'Configurações', icon:'⚙️', path:'/agency/settings', id:'config' },
          ].map(n => (
            <button key={n.id} style={{ ...s.navItem, ...(n.active ? s.navOn : {}) }} onClick={() => router.push(n.path)}>
              <span style={s.navIcon}>{n.icon}</span>
              {n.label}
              {n.badge && <span style={n.badgeType === 'amber' ? s.navBadgeAmber : s.navBadge}>{n.badge}</span>}
            </button>
          ))}
          <div style={s.sSection}>Atalhos</div>
          <button style={s.navItem} onClick={() => setModal(true)}>
            <span style={s.navIcon}>➕</span> Novo cliente
          </button>
          <button style={s.navItem} onClick={() => router.push('/agency/demands')}>
            <span style={s.navIcon}>📈</span> Relatórios
          </button>
        </div>
        <div style={s.sFooter}>
          <div style={s.sUserRow}>
            <div style={s.sUserAv}>{getInitials(agencyName)}</div>
            <div style={s.sUserName}>{agencyName}</div>
            <button style={s.sLogout} onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Sair</button>
          </div>
        </div>
      </aside>

      <div style={s.main}>
        {/* HEADER */}
        <div style={s.header}>
          <div style={s.breadcrumb}>
            <span>🏠</span>
            <span style={{ color: colors.text3 }}>/</span>
            <span>{agencyName}</span>
            <span style={{ color: colors.text3 }}>/</span>
            <span style={s.breadcrumbCurrent}>Clientes</span>
          </div>
          <div style={s.headerRight}>
            <div style={s.searchBox}>
              <span style={{ color: colors.text3 }}>🔍</span>
              <input style={s.searchInput} placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={s.headerBtn} onClick={() => setNotifOpen(!notifOpen)}>
              🔔
              {totalRevisions > 0 && <div style={s.notifDot} />}
            </div>
          </div>
        </div>

        <div style={s.body}>
          <div style={s.pageHead}>
            <div>
              <div style={s.pageTitle}>Clientes</div>
              <div style={s.pageSub}>Gerencie todos os clientes da sua agência.</div>
            </div>
            <button style={s.btnPrimary} onClick={() => setModal(true)}>➕ Novo cliente</button>
          </div>

          {/* STATS */}
          <div style={s.statsRow}>
            {[
              { icon:'👥', iconBg: colors.accentBg, label:'Clientes ativos', val: clients.length, sub:`${clients.length > 0 ? 'Total cadastrado' : 'Nenhum ainda'}` },
              { icon:'📋', iconBg: colors.amberBg, label:'Demandas totais', val: totalDemands, sub:`${demands.filter(d=>d.deadline).length} com prazo` },
              { icon:'✏️', iconBg: colors.redBg, label:'Alterações abertas', val: totalRevisions, sub: totalRevisions === 0 ? 'Nenhuma pendência' : 'Aguardando resposta' },
              { icon:'🔗', iconBg: colors.greenBg, label:'Links ativos', val: clients.length, sub:'Portais dos clientes' },
            ].map((stat, i) => (
              <div key={i} style={s.statCard}>
                <div style={{ ...s.statIcon, background: stat.iconBg }}>{stat.icon}</div>
                <div style={s.statLabel}>{stat.label}</div>
                <div style={s.statVal}>{stat.val}</div>
                <div style={s.statSub}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* LIST */}
          {filtered.length === 0 && (
            <div style={s.empty}>{search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Crie o primeiro!'}</div>
          )}

          {filtered.map(client => {
            const [accentC, bgC] = getAvatarColor(client.name)
            const clientRevs = clientRevisions(client.id)
            const clientDems = clientDemands(client.id)
            return (
              <div key={client.id} style={s.clientCard}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = colors.border2}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = colors.border}>
                <div style={{ ...s.cAvWrap, background: bgC, color: accentC }}>
                  {getInitials(client.name)}
                </div>
                <div style={s.cMain}>
                  <div style={s.cName}>{client.name}</div>
                  <div style={s.cMeta}>
                    {client.phone && <span>📱 {client.phone}</span>}
                    {client.email && <span>✉️ {client.email}</span>}
                    <span style={{ background: colors.accentBg, color: colors.accent, fontSize:10, padding:'2px 8px', borderRadius:8, fontWeight:500 }}>Pro</span>
                    <span>📅 Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div style={s.cStats}>
                  <div style={s.cStat}>
                    <div style={{ ...s.cStatV, color: clientDems > 0 ? colors.amber : colors.text }}>{clientDems}</div>
                    <div style={s.cStatL}>Demandas</div>
                    {clientDems > 0 && <div style={{ fontSize:10, color: colors.amber }}>Abertas</div>}
                  </div>
                  <div style={s.cStat}>
                    <div style={{ ...s.cStatV, color: clientRevs > 0 ? colors.red : colors.text }}>{clientRevs}</div>
                    <div style={s.cStatL}>Alterações</div>
                    {clientRevs > 0 && <div style={{ fontSize:10, color: colors.red }}>Pendentes</div>}
                  </div>
                </div>
                <div style={s.cActions}>
                  <button style={s.btnSm} title="WhatsApp" onClick={e => { e.stopPropagation(); client.phone && window.open(`https://wa.me/${client.phone.replace(/\D/g,'')}`) }}>📱</button>
                  <button style={s.btnSm} title="Copiar link" onClick={e => { e.stopPropagation(); copyLink(client) }}>🔗</button>
                  <button style={s.btnSm} title="Ver relatório" onClick={e => { e.stopPropagation(); router.push(`/agency/client/${client.id}`) }}>📊</button>
                  <button style={s.btnOpen} onClick={() => router.push(`/agency/client/${client.id}`)}>Abrir →</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={s.modalOverlay} onClick={() => setModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Novo cliente</span>
              <button style={s.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              {[
                { label:'Nome do cliente', key:'name', placeholder:'Ex: Barbearia do João', type:'text' },
                { label:'WhatsApp', key:'phone', placeholder:'(41) 99999-0000', type:'text' },
                { label:'Email (opcional)', key:'email', placeholder:'cliente@email.com', type:'email' },
              ].map(f => (
                <div key={f.key} style={s.fGroup}>
                  <label style={s.fLabel}>{f.label}</label>
                  <input style={s.fInput} type={f.type} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div style={s.modalFoot}>
              <button style={s.btnCancel} onClick={() => setModal(false)}>Cancelar</button>
              <button style={s.btnSave} onClick={createClient} disabled={saving}>{saving ? 'Criando...' : 'Criar cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
