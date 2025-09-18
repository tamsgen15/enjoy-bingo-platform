'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/UnifiedAuth'
import { Button } from '@/components/ui/button'
import UnifiedAuthModal from '@/components/UnifiedAuthModal'

export default function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()

  // Hide header on admin page
  if (pathname === '/admin') {
    return null
  }

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Enjoy Bingo" className="w-8 h-8" />
            <h1 className="text-xl font-bold text-white">Enjoy Bingo</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-white/70 text-sm">Welcome, {user.username}</span>
                <Button 
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {showAuthModal && (
        <UnifiedAuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </header>
  )
}