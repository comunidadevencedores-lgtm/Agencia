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
          .single()

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
          .single()

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
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      {/* HEADER */}
      <div style={{
        background: 'var(--bg1)',
        borderBottom: '1px solid var(--bg2)',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <Logo 
            size={48}
            customLogoUrl={agency.logo_url || undefined}
            agencyName={agency.name}
          />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
          {portal.client.name}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text3)' }}>
          {portal.client.email || 'Cliente'}
        </p>
      </div>

      {/* STATS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        padding: '24px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'var(--bg1)',
          padding: '16px',
          borderRadius: 8,
          textAlign: 'center',
          border: '1px solid var(--bg2)'
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brand)' }}>
            {allVideos.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Vídeos
          </div>
        </div>
        <div style={{
          background: 'var(--bg1)',
          padding: '16px',
          borderRadius: 8,
          textAlign: 'center',
          border: '1px solid var(--bg2)'
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--green)' }}>
            {openRevisions.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Revisões abertas
          </div>
        </div>
        <div style={{
          background: 'var(--bg1)',
          padding: '16px',
          borderRadius: 8,
          textAlign: 'center',
          border: '1px solid var(--bg2)'
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--orange)' }}>
            {portal.projects.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Projetos
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 24px 24px'
      }}>
        <div style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--bg2)',
          marginBottom: 24
        }}>
          <button
            onClick={() => setActiveTab('videos')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              color: activeTab === 'videos' ? 'var(--brand)' : 'var(--text3)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'videos' ? '2px solid var(--brand)' : 'none',
              marginBottom: '-1px'
            }}
          >
            Vídeos ({allVideos.length})
          </button>
          <button
            onClick={() => setActiveTab('revisions')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              color: activeTab === 'revisions' ? 'var(--brand)' : 'var(--text3)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'revisions' ? '2px solid var(--brand)' : 'none',
              marginBottom: '-1px'
            }}
          >
            Revisões ({openRevisions.length})
          </button>
        </div>

        {/* VIDEOS TAB */}
        {activeTab === 'videos' && (
          <div>
            {allVideos.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text3)'
              }}>
                Nenhum vídeo ainda
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 16
              }}>
                {allVideos.map(video => (
                  <div key={video.id} style={{
                    background: 'var(--bg1)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid var(--bg2)'
                  }}>
                    {video.youtube_url && (
                      <div style={{
                        width: '100%',
                        paddingBottom: '56.25%',
                        position: 'relative',
                        background: 'var(--bg2)'
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
                    <div style={{ padding: 12 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        {video.title}
                      </h3>
                      <div style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: video.status === 'approved' ? 'var(--green)' : 'var(--orange)',
                          color: 'white'
                        }}>
                          {video.status === 'approved' ? '✓ Aprovado' : '⏳ Pendente'}
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
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text3)'
              }}>
                Nenhuma revisão aberta
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {openRevisions.map(revision => (
                  <div key={revision.id} style={{
                    background: 'var(--bg1)',
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid var(--bg2)'
                  }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: 'var(--text)'
                    }}>
                      Revisão
                    </div>
                    <p style={{
                      fontSize: 13,
                      color: 'var(--text2)',
                      lineHeight: 1.5
                    }}>
                      {revision.description}
                    </p>
                    <div style={{
                      fontSize: 11,
                      color: 'var(--text3)',
                      marginTop: 12
                    }}>
                      Aberta em {new Date(revision.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        textAlign: 'center',
        padding: '24px',
        color: 'var(--text3)',
        fontSize: 12,
        borderTop: '1px solid var(--bg2)',
        marginTop: '48px'
      }}>
        Portal de entrega de criativos • {agency.name}
      </div>
    </div>
  )
}