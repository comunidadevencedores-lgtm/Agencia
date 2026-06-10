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
  const [approving, setApproving] = useState<string | null>(null)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [])

  async function load() {
    const { data: result, error } = await supabase.rpc('get_client_portal', {
      p_agency_slug: params.agency,
      p_client_slug: params.client,
    })
    if (error || !result || result.error) { setNotFound(true); setLoading(false); return }
    result.projects = result.projects || []
    result.revisions = result.revisions || []
    setData(result)
    // pré-marca aprovados
    const approved = new Set<string>()
    result.projects?.forEach((p: any) => p.videos?.forEach((v: any) => {
      if (v.status === 'approved' || v.approved_by_client) approved.add(v.id)
    }))
    setApprovedIds(approved)
    const firstVideo = result.projects?.[0]?.videos?.[0]
    if (firstVideo) setAltForm(p => ({ ...p, video_id: firstVideo.id }))
    setLoading(false)
  }

  async function approveVideo(videoId: string) {
    setApproving(videoId)
    await supabase.from('videos').update({
      approved_by_client: true,
      approved_at: new Date().toISOString(),
      status: 'approved'
    }).eq('id', videoId)
    setApprovedIds(prev => new Set([...prev, videoId]))
    setApproving(null)
    if (playerVideo?.id === videoId) setPlayerVideo(null)
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

  function driveDownloadUrl(url: string) {
    if (!url) return url
    const match = url.match(/\/file\/d\/([^/]+)/)
    if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`
    return url
  }

  function allVideos() {
    return data?.projects?.flatMap(p => p.videos || []) || []
  }

  function openRevision(videoId: string) {
    setAltForm(p => ({ ...p, video_id: videoId }))
    setPlayerVideo(null)
    setTab('alteracoes')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e0e', color: '#555', fontSize: 13 }}>
      Carregando...
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e0e0e', gap: 8 }}>
      <div style={{ fontSize: 18, color: '#999' }}>Link inválido</div>
      <div style={{ fontSize: 13, color: '#555' }}>Verifique com a agência.</div>
    </div>
  )

  if (!data) return null

  const videos = allVideos()
  const approvedCount = approvedIds.size
  const pendingCount = videos.length - approvedCount
  const openRevisions = data.revisions?.filter(r => r.status !== 'done') || []

  return (
    <div className={styles.wrap}>
      <div className={styles.phone}>

        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerTop}>Deliver</div>
          <div className={styles.headerName}>{data.client.name}</div>
          <div className={styles.headerSub}>{data.projects[0]?.title || 'Sem projeto ativo'}</div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statVal}>{videos.length}</div>
              <div className={styles.statLabel}>Vídeos</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal} style={{ color: pendingCount > 0 ? 'var(--amber)' : 'var(--green)' }}>{pendingCount}</div>
              <div className={styles.statLabel}>Pendentes</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal} style={{ color: approvedCount > 0 ? 'var(--green)' : 'inherit' }}>{approvedCount}</div>
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
            {videos.map(video => {
              const isApproved = approvedIds.has(video.id)
              const isApproving = approving === video.id
              return (
                <div key={video.id} className={styles.videoCard} data-approved={isApproved}>

                  {/* THUMB */}
                  <div className={styles.vThumb} onClick={() => !isApproved && setPlayerVideo(video)}
                    style={{ cursor: isApproved ? 'default' : 'pointer' }}>
                    {isApproved
                      ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✓</div>
                          <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>Aprovado</span>
                        </div>
                      : <>
                          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>▶</div>
                          {video.duration && <span className={styles.vPill}>{video.duration}</span>}
                        </>
                    }
                  </div>

                  <div className={styles.vBottom}>
                    <div className={styles.vTitle}>{video.title}</div>
                    <div className={styles.vMeta}>
                      {isApproved
                        ? <span style={{ color: 'var(--green)', fontSize: 11 }}>✓ Você aprovou este vídeo</span>
                        : `${video.orientation === 'vertical' ? 'Vertical 9:16' : 'Horizontal 16:9'} · Aguardando sua aprovação`
                      }
                    </div>

                    {!isApproved && (
                      <div className={styles.vBtns}>
                        {video.youtube_url && (
                          <a href={video.youtube_url} target="_blank" rel="noopener" className={styles.btnWatch}>▶ Assistir</a>
                        )}
                        {video.drive_url && (
                          <a href={driveDownloadUrl(video.drive_url)} target="_blank" rel="noopener" className={styles.btnDl}>↓ Baixar 4K</a>
                        )}
                      </div>
                    )}

                    {isApproved && video.drive_url && (
                      <a href={driveDownloadUrl(video.drive_url)} target="_blank" rel="noopener"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'var(--green-bg)', border: '0.5px solid var(--green)', borderRadius: 8, color: 'var(--green)', fontSize: 12, textDecoration: 'none', marginTop: 8 }}>
                        ↓ Baixar arquivo original 4K
                      </a>
                    )}

                    {!isApproved && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                        <button
                          onClick={() => approveVideo(video.id)}
                          disabled={isApproving}
                          style={{
                            padding: '10px', background: isApproving ? 'var(--green-bg)' : 'var(--green)', border: 'none',
                            borderRadius: 8, color: isApproving ? 'var(--green)' : '#000', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', transition: 'all .2s', gridColumn: 'span 2'
                          }}>
                          {isApproving ? 'Aprovando...' : '✓ Aprovar este vídeo'}
                        </button>
                        <button
                          onClick={() => openRevision(video.id)}
                          style={{ padding: '8px', background: 'transparent', border: '0.5px dashed var(--border2)', borderRadius: 8, color: 'var(--text3)', fontSize: 12, cursor: 'pointer', gridColumn: 'span 2' }}>
                          ✏ Pedir alteração
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {videos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 13 }}>
                Nenhum vídeo disponível ainda.
              </div>
            )}
          </div>
        )}

        {/* ALTERAÇÕES */}
        {tab === 'alteracoes' && (
          <div className={styles.section}>
            <div className={styles.secLabel}>Nova solicitação</div>
            <div className={styles.altForm}>
              <div className={styles.altFormTitle}>O que precisa mudar?</div>
              <select className={styles.altSel} value={altForm.video_id} onChange={e => setAltForm(p => ({ ...p, video_id: e.target.value }))}>
                {videos.filter(v => !approvedIds.has(v.id)).map(v => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
              <textarea className={styles.altTa} value={altForm.description} onChange={e => setAltForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Aumentar a fonte do texto no começo, tá difícil de ler no celular..." />
              <button className={styles.altSend} onClick={sendRevision} disabled={sending}>
                {sent ? '✓ Enviado!' : sending ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
            {data.revisions?.length > 0 && (
              <>
                <div className={styles.secLabel} style={{ marginTop: 20 }}>Histórico</div>
                {data.revisions.map((r: Revision) => (
                  <div key={r.id} className={styles.histItem}>
                    <div className={`${styles.histDot} ${r.status === 'done' ? styles.histDotDone : ''}`} />
                    <div className={styles.histInfo}>
                      <div className={styles.histTitle}>{r.description}</div>
                      <div className={styles.histDate}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
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
                    <div><div className={styles.mBtnLabel}>Assistir no YouTube</div><div className={styles.mBtnDesc}>Player em tela cheia</div></div>
                  </a>
                )}
                {playerVideo.drive_url && (
                  <a href={driveDownloadUrl(playerVideo.drive_url)} target="_blank" rel="noopener" className={styles.mBtn}>
                    <span className={styles.mBtnIcon}>↓</span>
                    <div><div className={styles.mBtnLabel}>Baixar em 4K</div><div className={styles.mBtnDesc}>Download direto do arquivo original</div></div>
                  </a>
                )}
                <button
                  onClick={() => approveVideo(playerVideo.id)}
                  disabled={approving === playerVideo.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 9, border: 'none', background: 'var(--green)', cursor: 'pointer', color: '#000', fontSize: 13, fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                  ✓ {approving === playerVideo.id ? 'Aprovando...' : 'Aprovar este vídeo'}
                </button>
                <button className={styles.mBtn} onClick={() => openRevision(playerVideo.id)}>
                  <span className={styles.mBtnIcon}>✏</span>
                  <div><div className={styles.mBtnLabel}>Pedir alteração</div><div className={styles.mBtnDesc}>Enviar feedback pra agência</div></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
