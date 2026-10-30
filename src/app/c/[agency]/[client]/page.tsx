'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { youtubeId } from '@/lib/youtube'
import type { Project, Revision, Video } from '@/lib/types'

interface ClientPortalPageProps {
  params: {
    agency: string
    client: string
  }
}

/* O portal público não tem acesso a e-mail, telefone nem faturamento
   (ver grants por coluna em supabase/000_setup.sql). */
type PortalAgency = { id: string; name: string; slug: string; logo_url: string | null }
type PortalClient = { id: string; agency_id: string; name: string; slug: string; logo_url: string | null }
type PortalData = {
  client: PortalClient
  projects: (Project & { videos: Video[] })[]
  revisions: Revision[]
}

export default function ClientPortalPage({ params }: ClientPortalPageProps) {
  const [portal, setPortal] = useState<PortalData | null>(null)
  const [agency, setAgency] = useState<PortalAgency | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'videos' | 'revisions'>('videos')
  const [error, setError] = useState('')
  const [revTarget, setRevTarget] = useState<Video | null>(null)
  const [revText, setRevText] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  const loadPortal = useCallback(async () => {
    try {
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('id, name, slug, logo_url, created_at')
        .eq('slug', params.agency)
        .maybeSingle()

      if (!agencyData) {
        setError('Agência não encontrada')
        return
      }

      setAgency(agencyData)

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agency_id, name, slug, logo_url, created_at')
        .eq('agency_id', agencyData.id)
        .eq('slug', params.client)
        .maybeSingle()

      if (!clientData) {
        setError('Cliente não encontrado')
        return
      }

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientData.id)

      const projectsWithVideos = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: videosData } = await supabase
            .from('videos')
            .select('*')
            .eq('project_id', project.id)

          return {
            ...project,
            videos: videosData || []
          }
        })
      )

      const { data: revisionsData } = await supabase
        .from('revisions')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false })

      setPortal({
        client: clientData,
        projects: projectsWithVideos,
        revisions: revisionsData || []
      })
    } catch (err) {
      console.error('Erro ao carregar portal:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [params.agency, params.client])

  useEffect(() => { loadPortal() }, [loadPortal])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  async function requestRevision() {
    if (!revTarget || !portal) return
    const description = revText.trim()
    if (description.length < 5) { showToast('Escreva o que precisa ser alterado.'); return }

    setSending(true)
    try {
      // Preferência: função no banco valida que o vídeo é mesmo deste cliente.
      const { error: rpcError } = await supabase.rpc('create_revision', {
        p_agency_slug: params.agency,
        p_client_slug: params.client,
        p_video_id: revTarget.id,
        p_description: description,
      })

      // Fallback para bancos sem a função (usa a policy de insert público).
      if (rpcError) {
        const { error } = await supabase.from('revisions').insert({
          video_id: revTarget.id,
          client_id: portal.client.id,
          description,
        })
        if (error) throw error
      }

      setRevTarget(null)
      setRevText('')
      await loadPortal()
      setActiveTab('revisions')
      showToast('Alteração enviada para a agência!')
    } catch (err: any) {
      console.error('Erro ao pedir alteração:', err)
      showToast('Não foi possível enviar. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  async function approveVideo(video: Video) {
    try {
      const { error: rpcError } = await supabase.rpc('approve_video', {
        p_agency_slug: params.agency,
        p_client_slug: params.client,
        p_video_id: video.id,
      })

      if (rpcError) {
        const { error } = await supabase.from('videos').update({
          status: 'approved',
          approved_by_client: true,
          approved_at: new Date().toISOString(),
        }).eq('id', video.id)
        if (error) throw error
      }

      setPortal(prev => prev ? {
        ...prev,
        projects: prev.projects.map(p => ({
          ...p,
          videos: p.videos.map(v => v.id === video.id ? { ...v, status: 'approved' as const } : v),
        })),
      } : prev)

      showToast('Vídeo aprovado. Obrigado!')
    } catch (err: any) {
      console.error('Erro ao aprovar vídeo:', err)
      showToast('Não foi possível aprovar. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg0)',
        color: 'var(--text3)'
      }}>
        Carregando...
      </div>
    )
  }

  if (error || !portal || !agency) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg0)',
        color: 'var(--red)',
        fontSize: 16
      }}>
        {error || 'Dados não encontrados'}
      </div>
    )
  }

  const allVideos = portal.projects.flatMap(p => p.videos)
  const openRevisions = portal.revisions.filter(r => r.status === 'open')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', paddingBottom: '40px' }}>
      {/* HEADER */}
      <div style={{
        background: 'var(--bg1)',
        borderBottom: '1px solid var(--bg2)',
        padding: '48px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Logo 
              size={64}
              customLogoUrl={agency.logo_url || undefined}
              agencyName={agency.name}
            />
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
            {portal.client.name}
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text3)' }}>
            Portal do Cliente · vídeos, aprovações e alterações
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* STATS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 24,
          padding: '40px 0'
        }}>
          <div style={{
            background: 'var(--bg1)',
            padding: '24px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid var(--bg2)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--brand)' }}>
              {allVideos.length}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 8, fontWeight: 500 }}>
              Vídeos Entregues
            </div>
          </div>
          <div style={{
            background: 'var(--bg1)',
            padding: '24px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid var(--bg2)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--green)' }}>
              {openRevisions.length}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 8, fontWeight: 500 }}>
              Revisões em Aberto
            </div>
          </div>
          <div style={{
            background: 'var(--bg1)',
            padding: '24px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid var(--bg2)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--orange)' }}>
              {portal.projects.length}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 8, fontWeight: 500 }}>
              Projetos Ativos
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{
          display: 'flex',
          gap: 32,
          borderBottom: '1px solid var(--bg2)',
          marginBottom: 32
        }}>
          <button
            onClick={() => setActiveTab('videos')}
            style={{
              padding: '16px 0',
              background: 'none',
              border: 'none',
              color: activeTab === 'videos' ? 'var(--brand)' : 'var(--text3)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'videos' ? '3px solid var(--brand)' : 'none',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            Vídeos ({allVideos.length})
          </button>
          <button
            onClick={() => setActiveTab('revisions')}
            style={{
              padding: '16px 0',
              background: 'none',
              border: 'none',
              color: activeTab === 'revisions' ? 'var(--brand)' : 'var(--text3)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'revisions' ? '3px solid var(--brand)' : 'none',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            Revisões ({openRevisions.length})
          </button>
        </div>

        {/* CONTENT AREA */}
        <div style={{ minHeight: '400px' }}>
          {/* VIDEOS TAB */}
          {activeTab === 'videos' && (
            <div>
              {allVideos.length === 0 ? (
                <div style={{
                  padding: '80px 20px',
                  textAlign: 'center',
                  color: 'var(--text3)',
                  background: 'var(--bg1)',
                  borderRadius: 12,
                  border: '1px dashed var(--bg2)'
                }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🎬</div>
                  Nenhum vídeo disponível no momento.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 24
                }}>
                  {allVideos.map(video => {
                    const yt = youtubeId(video.youtube_url)
                    return (
                    <div key={video.id} style={{
                      background: 'var(--bg1)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--bg2)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 12px 20px -10px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}>
                      {yt ? (
                        <div style={{
                          width: '100%',
                          paddingBottom: '56.25%',
                          position: 'relative',
                          background: '#000'
                        }}>
                          <iframe
                            src={`https://www.youtube.com/embed/${yt}`}
                            title={video.title}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              border: 'none'
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div style={{
                          padding: '40px 20px',
                          textAlign: 'center',
                          background: 'var(--bg3)',
                          color: 'var(--text3)',
                          fontSize: 13,
                        }}>
                          Prévia indisponível — use o botão de download.
                        </div>
                      )}
                      <div style={{ padding: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
                          {video.title}
                        </h3>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16
                        }}>
                          <span style={{
                            fontSize: 12,
                            padding: '6px 12px',
                            borderRadius: 20,
                            background: video.status === 'approved' ? 'var(--green-bg)' : 'var(--amber-bg)',
                            color: video.status === 'approved' ? 'var(--green)' : 'var(--amber)',
                            fontWeight: 600,
                          }}>
                            {video.status === 'approved' ? '✓ Aprovado' : '⏳ Em aprovação'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                            {new Date(video.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {video.drive_url && (
                            <a
                              href={video.drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btnGrad"
                              style={{ fontSize: 12, padding: '9px 14px', borderRadius: 9 }}
                            >
                              ⬇ Baixar 4K
                            </a>
                          )}
                          <button
                            onClick={() => { setRevTarget(video); setRevText('') }}
                            style={{
                              fontSize: 12,
                              padding: '9px 14px',
                              borderRadius: 9,
                              background: 'var(--bg3)',
                              border: '1px solid var(--border2)',
                              color: 'var(--text)',
                            }}
                          >
                            ✏️ Pedir alteração
                          </button>
                          {video.status !== 'approved' && (
                            <button
                              onClick={() => approveVideo(video)}
                              style={{
                                fontSize: 12,
                                padding: '9px 14px',
                                borderRadius: 9,
                                background: 'var(--green-bg)',
                                border: '1px solid var(--green)',
                                color: 'var(--green)',
                                fontWeight: 600,
                              }}
                            >
                              ✓ Aprovar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* REVISIONS TAB */}
          {activeTab === 'revisions' && (
            <div>
              {openRevisions.length === 0 ? (
                <div style={{
                  padding: '80px 20px',
                  textAlign: 'center',
                  color: 'var(--text3)',
                  background: 'var(--bg1)',
                  borderRadius: 12,
                  border: '1px dashed var(--bg2)'
                }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
                  Tudo limpo! Nenhuma revisão pendente.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {openRevisions.map(revision => (
                    <div key={revision.id} style={{
                      background: 'var(--bg1)',
                      padding: '24px',
                      borderRadius: 12,
                      border: '1px solid var(--bg2)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 16
                      }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: 'var(--text)'
                        }}>
                          Solicitação de Revisão
                        </div>
                        <span style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: 'var(--bg2)',
                          color: 'var(--text3)'
                        }}>
                          {new Date(revision.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 14,
                        color: 'var(--text2)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {revision.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL PEDIR ALTERAÇÃO */}
      {revTarget && (
        <div
          onClick={() => !sending && setRevTarget(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border2)',
              borderRadius: 16, padding: 24, width: '100%', maxWidth: 520,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Pedir alteração</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
              {revTarget.title}
            </div>
            <textarea
              autoFocus
              rows={5}
              value={revText}
              onChange={e => setRevText(e.target.value)}
              placeholder="Ex: trocar o texto do final e deixar o logo maior…"
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setRevTarget(null)}
                disabled={sending}
                style={{
                  padding: '10px 16px', borderRadius: 9, fontSize: 13,
                  background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)',
                }}
              >
                Cancelar
              </button>
              <button className="btnGrad" onClick={requestRevision} disabled={sending || revText.trim().length < 5}>
                {sending ? 'Enviando…' : 'Enviar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 60,
          boxShadow: '0 10px 30px rgba(0,0,0,.4)',
        }}>
          {toast}
        </div>
      )}

      {/* FOOTER */}
      <div style={{
        textAlign: 'center',
        padding: '40px 24px',
        color: 'var(--text3)',
        fontSize: 13,
        borderTop: '1px solid var(--bg2)',
        marginTop: '64px'
      }}>
        Portal de Entrega • {agency.name} • © {new Date().getFullYear()}
      </div>
    </div>
  )
}
