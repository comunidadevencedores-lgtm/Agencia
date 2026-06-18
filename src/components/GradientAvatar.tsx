/**
 * Logo do cliente da agência — replica a marca em forma de avatar com gradiente.
 * O gradiente é determinístico (derivado do nome), então cada cliente tem
 * sempre as mesmas cores. Mostra a imagem (logo_url) quando existir, senão
 * exibe as iniciais sobre o gradiente.
 */

const GRADS = [
  'linear-gradient(135deg, #4f7dff, #7b5bff)',
  'linear-gradient(135deg, #f5734f, #ff4f8b)',
  'linear-gradient(135deg, #34d399, #2bb3c0)',
  'linear-gradient(135deg, #f5b13d, #f5734f)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #22d3ee, #4f7dff)',
  'linear-gradient(135deg, #84cc16, #34d399)',
  'linear-gradient(135deg, #fb7185, #a855f7)',
]

function hash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function gradientFor(name: string) {
  return GRADS[hash(name || '?') % GRADS.length]
}

function initials(name: string) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).filter(Boolean).map(w => w[0].toUpperCase()).join('')
}

export function GradientAvatar({
  name,
  src,
  size = 44,
  radius,
}: {
  name: string
  src?: string | null
  size?: number
  radius?: number
}) {
  const r = radius ?? size * 0.28
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: gradientFor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
    >
      {initials(name)}
    </div>
  )
}
