'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import SignInModal from './SignInModal'

export default function AuthButton() {
  const [showSignIn, setShowSignIn] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  const handleDashboard = () => {
    if (user?.role === 'owner') {
      router.push('/owner/dashboard')
    } else if (user?.role === 'admin') {
      router.push('/admin')
    }
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDashboard}
          className="text-white/70 text-sm hover:text-white transition-colors"
        >
          {user.role === 'owner' ? '🏢' : '👨💼'} {user.name}
        </button>
        <button
          onClick={logout}
          className="bg-red-500/20 text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowSignIn(true)}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
      >
        🔐 Sign In
      </button>
      
      <SignInModal 
        isOpen={showSignIn} 
        onClose={() => setShowSignIn(false)} 
      />
    </>
  )
}