/**
 * Marca do Deliver — tile com gradiente azul→violeta e o símbolo "D".
 * Usado na sidebar (agência/admin), login e portal do cliente.
 */
export function Logo({
  size = 32,
  wordmark = false,
  subtitle,
}: {
  size?: number
  wordmark?: boolean
  subtitle?: string
}) {
  const tile = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'var(--grad)',
        boxShadow: 'var(--grad-glow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3.5h7.5a5 5 0 0 1 1.2 9.85A5.25 5.25 0 0 1 12.8 20.5H5V3.5Zm3.4 3v4.1h3.6a2.05 2.05 0 0 0 0-4.1H8.4Zm0 7v4.1h3.9a2.05 2.05 0 0 0 0-4.1H8.4Z"
          fill="#fff"
        />
      </svg>
    </div>
  )

  if (!wordmark) return tile

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      {tile}
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: size * 0.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Deliver
        </div>
        {subtitle && (
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
