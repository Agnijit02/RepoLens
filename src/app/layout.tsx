import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RepoLens — Deep Code Intelligence',
  description:
    'Instantly understand any GitHub repository. AST-powered analysis reveals entry points, architecture, business logic, and key relationships.',
  keywords: ['repository analysis', 'code intelligence', 'AST', 'software engineering'],
  openGraph: {
    title: 'RepoLens — Deep Code Intelligence',
    description: 'Instantly understand any GitHub repository.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
