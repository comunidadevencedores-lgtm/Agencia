'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { useRouter } from 'next/navigation'
import type { Agency } from '@/lib/types'

interface AgencyLayoutClientProps {
  children: React.ReactNode
  agencyId: string
}

export default function AgencyLayoutClient({ children, agencyId }: AgencyLayoutClientProps) {
  const router = useRouter()
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function load() {
      try {
        // Busca dados da agência
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', agencyId)
          .single()
        
        if (agencyData) {
          setAgency(agencyData)
        }

        // Busca nome do usuário logado
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.name) {
          setUserName(user.user_metadata.name)
        } else if (user?.email) {
          setUserName(user.email.split('@')[0])
        }
      } catch (err) {
        console.error('Erro ao carregar agência:', err)
      } finally {
        setLoading(false)
      }
    }

    if (agencyId) load()
  }, [agencyId])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg0)'
      }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <div style={{
        width: '220px',
        background: 'var(--bg0)',
        borderRight: '1px solid var(--bg2)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
      }}>
        {/* Logo e Nome da Agência */}
        <div style={{ marginBottom: '24px' }}>
          <Logo 
            size={40}
            customLogoUrl={agency?.logo_url || undefined}
            agencyName={agency?.name || 'Bowl Mídias'}
          />
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text)',
            marginTop: '8px',
            wordBreak: 'break-word'
          }}>
            {agency?.name || 'Agência'}
          </div>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', marginBottom: '12px' }}>MENU</div>
          {[
            { href: '/agency', label: 'Overview', icon: '📊' },
            { href: '/agency/clients', label: 'Clientes', icon: '👥' },
            { href: '/agency/demands', label: 'Demandas', icon: '📋' },
            { href: '/agency/revisions', label: 'Alterações', icon: '✏️' },
            { href: '/agency/team', label: 'Equipe', icon: '👨‍💼' },
            { href: '/agency/settings', label: 'Configurações', icon: '⚙️' },
          ].map(item => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                marginBottom: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text2)',
                cursor: 'pointer',
                borderRadius: '6px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg1)'
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text2)'
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{
          padding: '12px',
          background: 'var(--bg1)',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>{userName}</div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              width: '100%',
              padding: '6px',
              background: 'var(--bg2)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text3)',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'var(--bg0)' }}>
        {children}
      </div>
    </div>
  )
}