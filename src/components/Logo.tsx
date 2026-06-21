import React from 'react'

interface LogoProps {
  size?: number
  wordmark?: boolean
  customLogoUrl?: string | null
  agencyName?: string
  onClick?: () => void
}

export function Logo({ 
  size = 32, 
  wordmark = false, 
  customLogoUrl,
  agencyName = 'Bowl Mídias',
  onClick 
}: LogoProps) {
  const s = size
  
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* Se tem logo customizada, mostra */}
      {customLogoUrl ? (
        <img
          src={customLogoUrl}
          alt={agencyName}
          style={{
            width: s,
            height: s,
            borderRadius: '8px',
            objectFit: 'cover',
            flexShrink: 0
          }}
        />
      ) : (
        /* Senão, mostra o ícone padrão B */
        <svg
          width={s}
          height={s}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <rect width="64" height="64" rx="12" fill="#2952FF" />
          <text
            x="32"
            y="44"
            textAnchor="middle"
            fontSize="40"
            fontWeight="700"
            fill="white"
            fontFamily="'Bebas Neue', sans-serif"
          >
            B
          </text>
          <path
            d="M 16 50 Q 32 56 48 50"
            stroke="#1E3A8A"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Wordmark */}
      {wordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          <div
            style={{
              fontSize: `${size * 0.65}px`,
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1,
              letterSpacing: '-0.5px',
              fontFamily: "'Bebas Neue', sans-serif",
            }}
          >
            BOWL
          </div>
          <div
            style={{
              fontSize: `${size * 0.35}px`,
              fontWeight: 500,
              color: '#2952FF',
              lineHeight: 1,
              letterSpacing: '1px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            MÍDIAS
          </div>
        </div>
      )}
    </div>
  )
}