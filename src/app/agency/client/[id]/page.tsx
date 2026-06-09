'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Client, Project, Video, Revision } from '@/lib/types'
import styles from './client-detail.module.css'
import agStyles from '../../agency.module.css'

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<(Project & { videos: Video[] })[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [agencySlug, setAgencySlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalProject, setModalProject] = useState(false)
  const [modalVideo, setModalVideo] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState({ title: '' })
  const [videoForm, setVideoForm] = useState({ title: '', youtube_url: '', drive_url: '', duration: '', orientation: 'vertical' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: agency } = await supabase.from('agencies').select('slug').eq('id', user.id).single()
    if (agency) setAgencySlug(agency.slug)

    const { data: clientData } = await supabase.from('clients').select('*').eq('id', params.id).single()
    if (!clientData) { router.push('/agency'); return }
    setClient(clientData)

    const { data: projectsData } = await supabase.from('projects').select('*').eq('client_id', params.id).order('created_at', { ascending: false })

    const projectsWithVideos = await Promise.all((projectsData || []).map(async (p) => {
      const { data: videos } = await supabase.from('videos').select('*').eq('project_id', p.id).order('created_at', { ascending: true })
      return { ...p, videos: videos || [] }
    }))
    setProjects(projectsWithVideos)

    const { data: revData } = await supabase.from('revisions').select('*').eq('client_id', params.id).order('created_at', { ascending: false })
    setRevisions(revData || [])
    setLoading(false)
  }

  function clientLink() {
    return `${window.location.origin}/c/${agencySlug}/${client?.slug}`
  }

  function copyLink() {
    navigator.clipboard.writeText(clientLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function createProject() {
    if (!projectForm.title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('projects').insert({ client_id: params.id, title: projectForm.title }).select().single()
    if (data) setProjects(prev => [{ ...data, videos: [] }, ...prev])
    setModalProject(false)
    setProjectForm({ title: '' })
    setSaving(false)
  }

  async function createVideo(projectId: string) {
    if (!videoForm.title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('videos').insert({
      project_id: projectId,
      title: videoForm.title,
      youtube_url: videoForm.youtube_url || null,
      drive_url: videoForm.drive_url || null,
      duration: videoForm.duration || null,
      orientation: videoForm.orientation,
    }).select().single()
    if (data) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, videos: [...p.videos, data] } : p))
    }
    setModalVideo(null)
    setVideoForm({ title: '', youtube_url: '', drive_url: '', duration: '', orientation: 'vertical' })
    setSaving(false)
  }

  async function resolveRevision(id: string) {
    await supabase.from('revisions').update({ status: 'done' }).eq('id', id)
    setRevisions(prev => prev.map(r => r.id === id ? { ...r, status: 'done' } : r))
  }

  async function approveVideo(videoId: string) {
    await supabase.from('videos').update({ status: 'approved' }).eq('id', videoId)
    setProjects(prev => prev.map(p => ({
      ...p,
      videos: p.videos.map(v => v.id === videoId ? { ...v, status: 'approved' as const } : v)
    })))
  }

  if (loading) return <div className={agStyles.loading}>Carregando...</div>
  if (!client) return null

  const initials = client.name.split(' ').slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')

  return (
    <div className={agStyles.app}>
      <aside className={agStyles.sidebar}>
        <div className={agStyles.sLogo}>
          <div className={agStyles.sLogoTop}>Deliver</div>
          <div className={agStyles.sLogoName}>Painel da agência</div>
        </div>
        <nav className={styles.sNav}>
  <div className={styles.navItem} onClick={() => router.push('/agency')}>
    <span>👥</span> Clientes
  </div>
  <div className={styles.navItem} onClick={() => router.push('/agency/demands')}>
    <span>📋</span> Demandas
  </div>
  <div className={styles.navItem} onClick={() => router.push('/agency/revisions')}>
    <span>✏️</span> Alterações
  </div>
  <div className={styles.navItem} onClick={() => router.push('/agency/settings')}>
    <span>⚙️</span> Configurações
  </div>
</nav>
        <div className={agStyles.sFoot}>
          <button className={agStyles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Sair</button>
        </div>
      </aside>

      <main className={agStyles.main}>
        {/* HEADER */}
        <button className={styles.backBtn} onClick={() => router.push('/agency')}>← Voltar</button>
        <div className={styles.detailHead}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <div className={styles.detailName}>{client.name}</div>
            <div className={styles.detailSub}>{client.phone || client.email || 'Sem contato'}</div>
          </div>
        </div>

        {/* LINK */}
        <div className={styles.linkBox}>
          <span className={styles.linkUrl}>{agencySlug ? clientLink() : 'Carregando...'}</span>
          <button className={styles.btnCopyLink} onClick={copyLink}>
            {copied ? '✓ Copiado!' : 'Copiar link'}
          </button>
        </div>

        {/* PROJETOS */}
        <div className={styles.sectionHead}>
          <div className={agStyles.pageTitle}>Projetos</div>
          <button className={agStyles.btnPrimary} onClick={() => setModalProject(true)}>+ Novo projeto</button>
        </div>

        {projects.length === 0 && <div className={agStyles.empty}>Nenhum projeto ainda.</div>}

        {projects.map(project => (
          <div key={project.id} className={styles.projectCard}>
            <div className={styles.projectHeader}>
              <div className={styles.projectTitle}>{project.title}</div>
              <button className={styles.btnAddVideo} onClick={() => setModalVideo(project.id)}>+ Vídeo</button>
            </div>

            <div className={styles.videosGrid}>
              {project.videos.map(video => (
                <div key={video.id} className={styles.videoCard} data-approved={video.status === 'approved'}>
                  <div className={styles.vThumb}>
                    <span className={styles.vIcon}>{video.status === 'approved' ? '✓' : '▶'}</span>
                  </div>
                  <div className={styles.vInfo}>
                    <div className={styles.vTitle}>{video.title}</div>
                    <div className={styles.vMeta}>{video.duration || '—'} · {video.orientation}</div>
                    <div className={styles.vBtns}>
                      {video.youtube_url && (
                        <a href={video.youtube_url} target="_blank" rel="noopener" className={styles.btnWatch}>▶ Ver</a>
                      )}
                      {video.drive_url && (
                        <a href={video.drive_url} target="_blank" rel="noopener" className={styles.btnDl}>↓ Drive</a>
                      )}
                      {video.status !== 'approved' && (
                        <button className={styles.btnApprove} onClick={() => approveVideo(video.id)}>✓ Aprovar</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {project.videos.length === 0 && (
                <div className={styles.emptyVideos}>Nenhum vídeo ainda.</div>
              )}
            </div>
          </div>
        ))}

        {/* ALTERAÇÕES */}
        {revisions.length > 0 && (
          <>
            <div className={styles.sectionHead} style={{ marginTop: 24 }}>
              <div className={agStyles.pageTitle}>Alterações do cliente</div>
            </div>
            <div className={agStyles.clientList}>
              {revisions.map(r => (
                <div key={r.id} className={agStyles.clientCard}>
                  <div className={agStyles.cInfo}>
                    <div className={agStyles.cName}>{r.description}</div>
                    <div className={agStyles.cMeta}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  {r.status === 'done'
                    ? <span style={{ fontSize: 11, color: 'var(--green)' }}>Resolvido</span>
                    : <button className={agStyles.btnCopy} onClick={() => resolveRevision(r.id)}>Resolver</button>
                  }
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* MODAL NOVO PROJETO */}
      {modalProject && (
        <div className={agStyles.modalOverlay} onClick={() => setModalProject(false)}>
          <div className={agStyles.modal} onClick={e => e.stopPropagation()}>
            <div className={agStyles.modalHead}>
              <span className={agStyles.modalTitle}>Novo projeto</span>
              <button className={agStyles.mClose} onClick={() => setModalProject(false)}>✕</button>
            </div>
            <div className={agStyles.modalBody}>
              <div className={agStyles.fGroup}>
                <label>Nome do projeto / campanha</label>
                <input type="text" value={projectForm.title} onChange={e => setProjectForm({ title: e.target.value })} placeholder="Ex: Campanha Junho — Reels" />
              </div>
            </div>
            <div className={agStyles.modalFoot}>
              <button className={agStyles.btnCancel} onClick={() => setModalProject(false)}>Cancelar</button>
              <button className={agStyles.btnSave} onClick={createProject} disabled={saving}>{saving ? 'Criando...' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO VÍDEO */}
      {modalVideo && (
        <div className={agStyles.modalOverlay} onClick={() => setModalVideo(null)}>
          <div className={agStyles.modal} onClick={e => e.stopPropagation()}>
            <div className={agStyles.modalHead}>
              <span className={agStyles.modalTitle}>Adicionar vídeo</span>
              <button className={agStyles.mClose} onClick={() => setModalVideo(null)}>✕</button>
            </div>
            <div className={agStyles.modalBody}>
              <div className={agStyles.fGroup}>
                <label>Nome do vídeo</label>
                <input type="text" value={videoForm.title} onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Reel 01 — Promoção" />
              </div>
              <div className={agStyles.fGroup}>
                <label>Link YouTube (não listado)</label>
                <input type="text" value={videoForm.youtube_url} onChange={e => setVideoForm(p => ({ ...p, youtube_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div className={agStyles.fGroup}>
                <label>Link Google Drive (4K)</label>
                <input type="text" value={videoForm.drive_url} onChange={e => setVideoForm(p => ({ ...p, drive_url: e.target.value }))} placeholder="https://drive.google.com/file/..." />
              </div>
              <div className={agStyles.fGroup}>
                <label>Duração</label>
                <input type="text" value={videoForm.duration} onChange={e => setVideoForm(p => ({ ...p, duration: e.target.value }))} placeholder="Ex: 00:28" />
              </div>
              <div className={agStyles.fGroup}>
                <label>Orientação</label>
                <select value={videoForm.orientation} onChange={e => setVideoForm(p => ({ ...p, orientation: e.target.value }))}>
                  <option value="vertical">Vertical (9:16)</option>
                  <option value="horizontal">Horizontal (16:9)</option>
                </select>
              </div>
            </div>
            <div className={agStyles.modalFoot}>
              <button className={agStyles.btnCancel} onClick={() => setModalVideo(null)}>Cancelar</button>
              <button className={agStyles.btnSave} onClick={() => createVideo(modalVideo)} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
