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

  // Only show header on homepage
  if (pathname !== '/') {
    return null
  }

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Enjoy Bingo" className="w-7 h-7 sm:w-8 sm:h-8" />
            <h1 className="text-lg sm:text-xl font-bold text-white">Enjoy Bingo</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <span className="text-white/70 text-xs sm:text-sm hidden sm:inline">
                  Welcome, {user.username}
                </span>
                <span className="text-white/70 text-xs sm:hidden">
                  {user.username}
                </span>
                <Button 
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-3 sm:px-4 py-2"
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