'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import type { Agency, Client, ClientPortal } from '@/lib/types'

interface ClientPortalPageProps {
  params: {
    agency: string
    client: string
  }
}

export default function ClientPortalPage({ params }: ClientPortalPageProps) {
  const [portal, setPortal] = useState<ClientPortal | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'videos' | 'revisions'>('videos')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('*')
          .eq('slug', params.agency)
          .maybeSingle()

        if (!agencyData) {
          setError('Agência não encontrada')
          return
        }

        setAgency(agencyData)

        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
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
    }

    load()
  }, [params.agency, params.client])

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
            {portal.client.email || 'Portal do Cliente'}
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
                  {allVideos.map(video => (
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
                      {video.youtube_url && (
                        <div style={{
                          width: '100%',
                          paddingBottom: '56.25%',
                          position: 'relative',
                          background: '#000'
                        }}>
                          <iframe
                            src={`https://www.youtube.com/embed/${video.youtube_url}`}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              border: 'none'
                            }}
                            allowFullScreen
                          />
                        </div>
                      )}
                      <div style={{ padding: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
                          {video.title}
                        </h3>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            fontSize: 12,
                            padding: '6px 12px',
                            borderRadius: 20,
                            background: video.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                            color: video.status === 'approved' ? 'var(--green)' : 'var(--orange)',
                            fontWeight: 600,
                            border: `1px solid ${video.status === 'approved' ? 'var(--green)' : 'var(--orange)'}44`
                          }}>
                            {video.status === 'approved' ? '✓ Aprovado' : '⏳ Em Aprovação'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                            {new Date(video.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
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
