import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Deliver',
  description: 'Portal de entrega de criativos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
