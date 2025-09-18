import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Owner Dashboard - Enjoy Bingo',
  description: 'Platform owner administration panel',
}

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}