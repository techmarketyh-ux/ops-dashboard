import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ops Dashboard — Dropshipping',
  description: 'Dashboard de métricas operativas'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
