'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

export default function ConditionalHeader() {
  const pathname = usePathname()
  
  // Show header only on game-related pages
  const showHeader = pathname.startsWith('/game') || pathname === '/admin'
  
  if (!showHeader) {
    return null
  }
  
  return <Header />
}