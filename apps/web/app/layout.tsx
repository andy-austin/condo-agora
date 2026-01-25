import type { Metadata } from 'next'
import { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vercel Python React',
  description: 'Full-stack application with Next.js and Python FastAPI',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
