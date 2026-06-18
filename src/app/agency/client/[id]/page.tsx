'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Client, Project, Video, Revision } from '@/lib/types'
import { GradientAvatar } from '@/components/GradientAvatar'
import { useAgency } from '../../agency-context'
import s from '../../pages.module.css'

type ProjectWithVideos = Project & { videos: Video[] }

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { agencyId, agencySlug, canEdit, refresh } = useAgency()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<ProjectWithVideos[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState('')

  const [projModal, setProjModal] = useState(false)
  const [projTitle, setProjTitle] = useState('')
  const [vidModal, setVidModal] = useState<string | null>(null) // project_id
  const [vidForm, setVidForm] = useState({ title: '', youtube_url: '', drive_url: '', orientation: 'vertical' as 'vertical' | 'horizontal' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: c } = await supabase.from('clients').select('*').eq('id', params.id).eq('agency_id', agencyId).maybeSingle()
    if (!c) { setNotFound(true); setLoading(false); return }
    setClient(c)
    const { data: proj } = await supabase.from('projects').select('*').eq('client_id', c.id).order('created_at', { ascending: false })
    const withVids = await Promise.all((proj || []).map(async p => {
      const { data: vids } = await supabase.from('videos').select('*').eq('project_id', p.id).order('created_at', { ascending: true })
      return { ...p, videos: vids || [] }
    }))
    setProjects(withVids)
    const { data: revs } = await supabase.from('revisions').select('*').eq('client_id', c.id).order('created_at', { ascending: false })
    setRevisions(revs || [])
    setLoading(false)
  }, [params.id, agencyId])

  useEffect(() => { load() }, [load])

  function fade() { setTimeout(() => setToast(''), 2500) }

  async function addProject() {
    if (!projTitle.trim()) return
    setSaving(true)
    const { data } = await supabase.from('projects').insert({ client_id: params.id, title: projTitle }).select().single()
    if (data) setProjects(prev => [{ ...data, videos: [] }, ...prev])
    setProjModal(false); setProjTitle(''); setSaving(false)
  }

  async function addVideo() {
    if (!vidModal || !vidForm.title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('videos').insert({
      project_id: vidModal, title: vidForm.title,
      youtube_url: vidForm.youtube_url || null, drive_url: vidForm.drive_url || null,
      orientation: vidForm.orientation,
    }).select().single()
    if (data) setProjects(prev => prev.map(p => p.id === vidModal ? { ...p, videos: [...p.videos, data] } : p))
    setVidModal(null); setVidForm({ title: '', youtube_url: '', drive_url: '', orientation: 'vertical' }); setSaving(false)
  }

  async function resolveRevision(id: string) {
    await supabase.from('revisions').update({ status: 'done' }).eq('id', id)
    setRevisions(prev => prev.map(r => r.id === id ? { ...r, status: 'done' as const } : r)); refresh()
  }

  function copyLink() {
    if (!agencySlug || !client) { setToast('Configure o slug em Configurações'); fade(); return }
    navigator.clipboard.writeText(`${window.location.origin}/c/${agencySlug}/${client.slug}`)
    setToast('Link copiado!'); fade()
  }

  if (loading) return <div className={s.empty}>Carregando…</div>
  if (notFound || !client) return (
    <>
      <button className={s.btnOutline} onClick={() => router.push('/agency')}>← Voltar</button>
      <div className={s.empty} style={{ marginTop: 16 }}>Cliente não encontrado.</div>
    </>
  )

  const totalVideos = projects.reduce((n, p) => n + p.videos.length, 0)
  const openRevs = revisions.filter(r => r.status !== 'done').length

  return (
    <>
      <button className={s.btnOutline} style={{ marginBottom: 18 }} onClick={() => router.push('/agency')}>← Voltar</button>

      {/* HEADER */}
      <div className={s.pageHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <GradientAvatar name={client.name} size={56} />
          <div>
            <div className={s.greet} style={{ fontSize: 22 }}>{client.name}</div>
            <div className={s.pageSub}>{client.phone || client.email || 'Sem contato'} · cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div className={s.headActions}>
          <button className={s.btnOutline} onClick={copyLink}>Copiar link</button>
          {client.phone && (
            <a className="btnGrad" href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener">WhatsApp</a>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className={s.statsRow}>
        <div className={s.statCard}><div className={s.statTop}><span className={s.statLabel}>Projetos</span><span className={s.statIcon} style={{ background: 'var(--brand-bg)' }}>📁</span></div><div className={s.statVal}>{projects.length}</div></div>
        <div className={s.statCard}><div className={s.statTop}><span className={s.statLabel}>Vídeos</span><span className={s.statIcon} style={{ background: 'var(--blue-bg)' }}>🎬</span></div><div className={s.statVal}>{totalVideos}</div></div>
        <div className={s.statCard}><div className={s.statTop}><span className={s.statLabel}>Alterações abertas</span><span className={s.statIcon} style={{ background: 'var(--red-bg)' }}>✏️</span></div><div className={s.statVal}>{openRevs}</div></div>
        <div className={s.statCard}><div className={s.statTop}><span className={s.statLabel}>Link do portal</span><span className={s.statIcon} style={{ background: 'var(--green-bg)' }}>🔗</span></div><div className={s.statVal} style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)' }}>/c/{agencySlug || '…'}/{client.slug}</div></div>
      </div>

      {/* PROJETOS */}
      <div className={s.sectionBar}>
        <span className={s.sectionTitle}>Projetos & vídeos</span>
        {canEdit && <button className="btnGrad" onClick={() => setProjModal(true)}>+ Novo projeto</button>}
      </div>

      {projects.length === 0 && <div className={s.empty} style={{ marginBottom: 20 }}>Nenhum projeto ainda.</div>}

      {projects.map(p => (
        <div key={p.id} className={s.panel} style={{ marginBottom: 14 }}>
          <div className={s.row} style={{ background: 'var(--bg3)' }}>
            <div className={s.rowMain}>
              <div className={s.rowName}>{p.title}</div>
              <div className={s.rowMeta}>{p.videos.length} vídeo(s) · {p.status === 'active' ? 'Ativo' : 'Fechado'}</div>
            </div>
            {canEdit && <button className={s.btnOutline} onClick={() => setVidModal(p.id)}>+ Vídeo</button>}
          </div>
          {p.videos.map(v => (
            <div key={v.id} className={s.row}>
              <div className={s.rowMain}>
                <div className={s.rowName}>{v.title}</div>
                <div className={s.rowMeta}>{v.orientation === 'vertical' ? 'Vertical 9:16' : 'Horizontal 16:9'} · {v.status === 'approved' ? '✓ Aprovado' : 'Pendente'}</div>
              </div>
              {v.youtube_url && <a className={s.btnOutline} href={v.youtube_url} target="_blank" rel="noopener">▶ Assistir</a>}
              {v.drive_url && <a className={s.btnOutline} href={v.drive_url} target="_blank" rel="noopener">↓ Drive</a>}
            </div>
          ))}
          {p.videos.length === 0 && <div className={s.empty} style={{ border: 'none', padding: 20 }}>Sem vídeos neste projeto.</div>}
        </div>
      ))}

      {/* ALTERAÇÕES */}
      {revisions.length > 0 && (
        <>
          <div className={s.sectionBar} style={{ marginTop: 24 }}><span className={s.sectionTitle}>Alterações solicitadas</span></div>
          <div className={s.panel}>
            {revisions.map(r => (
              <div key={r.id} className={s.row}>
                <div className={s.rowMain}>
                  <div className={s.rowName}>{r.description}</div>
                  <div className={s.rowMeta}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                {r.status === 'done'
                  ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Resolvido</span>
                  : canEdit && <button className="btnGrad" onClick={() => resolveRevision(r.id)}>Resolver</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL PROJETO */}
      {projModal && (
        <div className={s.modalOverlay} onClick={() => setProjModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}><span className={s.modalTitle}>Novo projeto</span><button className={s.mClose} onClick={() => setProjModal(false)}>✕</button></div>
            <div className={s.modalBody}>
              <div className={s.field}><label>Título do projeto</label>
                <input value={projTitle} onChange={e => setProjTitle(e.target.value)} placeholder="Ex: Campanha de Junho — Reels" /></div>
            </div>
            <div className={s.modalFoot}>
              <button className={s.btnOutline} onClick={() => setProjModal(false)}>Cancelar</button>
              <button className="btnGrad" onClick={addProject} disabled={saving}>{saving ? 'Criando…' : 'Criar projeto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VÍDEO */}
      {vidModal && (
        <div className={s.modalOverlay} onClick={() => setVidModal(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}><span className={s.modalTitle}>Novo vídeo</span><button className={s.mClose} onClick={() => setVidModal(null)}>✕</button></div>
            <div className={s.modalBody}>
              <div className={s.field}><label>Título</label>
                <input value={vidForm.title} onChange={e => setVidForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Reel 01 — Promoção" /></div>
              <div className={s.field}><label>Link do YouTube (não listado)</label>
                <input value={vidForm.youtube_url} onChange={e => setVidForm(p => ({ ...p, youtube_url: e.target.value }))} placeholder="https://youtu.be/…" /></div>
              <div className={s.field}><label>Link do Drive (4K)</label>
                <input value={vidForm.drive_url} onChange={e => setVidForm(p => ({ ...p, drive_url: e.target.value }))} placeholder="https://drive.google.com/…" /></div>
              <div className={s.field}><label>Orientação</label>
                <select value={vidForm.orientation} onChange={e => setVidForm(p => ({ ...p, orientation: e.target.value as any }))}>
                  <option value="vertical">Vertical 9:16</option>
                  <option value="horizontal">Horizontal 16:9</option>
                </select></div>
            </div>
            <div className={s.modalFoot}>
              <button className={s.btnOutline} onClick={() => setVidModal(null)}>Cancelar</button>
              <button className="btnGrad" onClick={addVideo} disabled={saving}>{saving ? 'Salvando…' : 'Adicionar vídeo'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={s.toast}>✓ {toast}</div>}
    </>
  )
}
