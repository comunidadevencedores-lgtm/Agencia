'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClientPortal, Video, Revision } from '@/lib/types'
import styles from './client.module.css'

export default function ClientPortalPage({
  params
}: {
  params: { agency: string; client: string }
}) {
  const [data, setData] = useState<ClientPortal | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<'videos' | 'alteracoes'>('videos')
  const [playerVideo, setPlayerVideo] = useState<Video | null>(null)
  const [altForm, setAltForm] = useState({ video_id: '', description: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: result, error } = await supabase.rpc('get_client_portal', {
      p_agency_slug: params.agency,
      p_client_slug: params.client,
    })
    if (error || !result || result.error) { setNotFound(true); setLoading(false); return }
    setData(result)
    // pré-seleciona primeiro vídeo no form
    const firstVideo = result.projects?.[0]?.videos?.[0]
    if (firstVideo) setAltForm(p => ({ ...p, video_id: firstVideo.id }))
    setLoading(false)
  }

  async function sendRevision() {
    if (!altForm.description.trim() || !data) return
    setSending(true)
    await supabase.from('revisions').insert({
      video_id: altForm.video_id,
      client_id: data.client.id,
      description: altForm.description,
      status: 'open',
    })
    setSent(true)
    setSending(false)
    setAltForm(p => ({ ...p, description: '' }))
    await load()
    setTimeout(() => setSent(false), 3000)
  }

  function allVideos() {
    return data?.projects?.flatMap(p => p.videos || []) || []
  }

  function openRevision(videoId: string) {
    setAltForm(p => ({ ...p, video_id: videoId }))
    setPlayerVideo(null)
    setTab('alteracoes')
  }

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (notFound) return (
    <div className={styles.notFound}>
      <div className={styles.notFoundTitle}>Link inválido</div>
      <div className={styles.notFoundSub}>Verifique com a agência.</div>
    </div>
  )
  if (!data) return null

  const videos = allVideos()
  const openRevisions = data.revisions?.filter(r => r.status !== 'done') || []
  const doneRevisions = data.revisions?.filter(r => r.status === 'done') || []
  const projectTitle = data.projects?.[0]?.title || 'Sem projeto ativo'

  return (
    <div className={styles.wrap}>
      <div className={styles.phone}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerTop}>Deliver</div>
          <div className={styles.headerName}>{data.client.name}</div>
          <div className={styles.headerSub}>
            {projectTitle}
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statVal}>{videos.length}</div>
              <div className={styles.statLabel}>Vídeos</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal}>{openRevisions.length}</div>
              <div className={styles.statLabel}>Pendentes</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal}>{videos.filter(v => v.status === 'approved').length}</div>
              <div className={styles.statLabel}>Aprovados</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className={styles.tabBar}>
          <button className={`${styles.tab} ${tab === 'videos' ? styles.tabOn : ''}`} onClick={() => setTab('videos')}>Vídeos</button>
          <button className={`${styles.tab} ${tab === 'alteracoes' ? styles.tabOn : ''}`} onClick={() => setTab('alteracoes')}>
            Alterações {openRevisions.length > 0 && <span className={styles.tabBadge}>{openRevisions.length}</span>}
          </button>
        </div>

        {/* VÍDEOS */}
        {tab === 'videos' && (
          <div className={styles.section}>
            {videos.map(video => (
              <div key={video.id} className={styles.videoCard} data-approved={video.status === 'approved'}>
                <div className={styles.vThumb} onClick={() => setPlayerVideo(video)}>
                  <span className={styles.vIcon}>{video.status === 'approved' ? '✓' : '▶'}</span>
                  <span className={styles.vPill}>{video.duration || '—'}</span>
                </div>
                <div className={styles.vBottom}>
                  <div className={styles.vTitle}>{video.title}</div>
                  <div className={styles.vMeta}>
                    {video.status === 'approved'
                      ? <span className={styles.approved}>✓ Aprovado</span>
                      : `${video.orientation === 'vertical' ? 'Vertical 9:16' : 'Horizontal 16:9'} · Alta resolução disponível`
                    }
                  </div>
                  <div className={styles.vBtns}>
                    {video.youtube_url && (
                      <a href={video.youtube_url} target="_blank" rel="noopener" className={styles.btnWatch}>
                        ▶ Assistir
                      </a>
                    )}
                    {video.drive_url && (
                      <a href={video.drive_url} target="_blank" rel="noopener" className={styles.btnDl}>
                        ↓ Baixar 4K
                      </a>
                    )}
                    {video.status !== 'approved' && (
                      <button className={styles.btnAlt} onClick={() => openRevision(video.id)}>
                        ✏ Pedir alteração
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ALTERAÇÕES */}
        {tab === 'alteracoes' && (
          <div className={styles.section}>
            <div className={styles.secLabel}>Nova solicitação</div>
            <div className={styles.altForm}>
              <div className={styles.altFormTitle}>O que precisa mudar?</div>
              <select
                className={styles.altSel}
                value={altForm.video_id}
                onChange={e => setAltForm(p => ({ ...p, video_id: e.target.value }))}
              >
                {videos.map(v => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
              <textarea
                className={styles.altTa}
                value={altForm.description}
                onChange={e => setAltForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Aumentar a fonte do texto no começo, tá difícil de ler no celular..."
              />
              <button className={styles.altSend} onClick={sendRevision} disabled={sending}>
                {sent ? '✓ Enviado!' : sending ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>

            {data.revisions?.length > 0 && (
              <>
                <div className={styles.secLabel} style={{ marginTop: 20 }}>Histórico</div>
                {data.revisions?.map((r: Revision) => (
                  <div key={r.id} className={styles.histItem}>
                    <div className={`${styles.histDot} ${r.status === 'done' ? styles.histDotDone : ''}`} />
                    <div className={styles.histInfo}>
                      <div className={styles.histTitle}>{r.description}</div>
                      <div className={styles.histDate}>
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <span className={`${styles.histBadge} ${r.status === 'done' ? styles.badgeDone : styles.badgePend}`}>
                      {r.status === 'done' ? 'Resolvido' : 'Em andamento'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL PLAYER */}
      {playerVideo && (
        <div className={styles.modalOverlay} onClick={() => setPlayerVideo(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span>{playerVideo.title}</span>
              <button onClick={() => setPlayerVideo(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalThumb}>▶</div>
              <div className={styles.modalActions}>
                {playerVideo.youtube_url && (
                  <a href={playerVideo.youtube_url} target="_blank" rel="noopener" className={styles.mBtn}>
                    <span className={styles.mBtnIcon}>▶</span>
                    <div>
                      <div className={styles.mBtnLabel}>Assistir no YouTube</div>
                      <div className={styles.mBtnDesc}>Player em tela cheia</div>
                    </div>
                  </a>
                )}
                {playerVideo.drive_url && (
                  <a href={playerVideo.drive_url} target="_blank" rel="noopener" className={styles.mBtn}>
                    <span className={styles.mBtnIcon}>↓</span>
                    <div>
                      <div className={styles.mBtnLabel}>Baixar em 4K</div>
                      <div className={styles.mBtnDesc}>Arquivo original via Google Drive</div>
                    </div>
                  </a>
                )}
                <button className={styles.mBtn} onClick={() => openRevision(playerVideo.id)}>
                  <span className={styles.mBtnIcon}>✏</span>
                  <div>
                    <div className={styles.mBtnLabel}>Pedir alteração</div>
                    <div className={styles.mBtnDesc}>Enviar feedback pra agência</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
