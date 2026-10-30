/**
 * Aceita tanto o ID puro quanto qualquer formato de link do YouTube
 * (youtu.be/ID, watch?v=ID, /shorts/ID, /embed/ID) e devolve o ID.
 */
export function youtubeId(input?: string | null): string | null {
  if (!input) return null

  const value = input.trim()
  if (/^[\w-]{11}$/.test(value)) return value

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (match) return match[1]
  }

  return null
}
