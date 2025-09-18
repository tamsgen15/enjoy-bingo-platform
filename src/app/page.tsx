'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/UnifiedAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import UnifiedAuthModal from '@/components/UnifiedAuthModal'

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [games, setGames] = useState<any[]>([])
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchGames()
    
    if (user) {
      if (user.role === 'admin') {
        router.push('/admin')
      } else if (user.role === 'owner') {
        router.push('/owner/dashboard')
      } else {
        router.push('/game')
      }
    }
  }, [user, router])

  const fetchGames = async () => {
    try {
      const { data } = await supabase.from('games').select('*').order('created_at', { ascending: false })
      setGames(data || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-white">Welcome {user.username}!</h2>
              <p className="text-white/70 mb-4">Role: {user.role}</p>
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    if (user.role === 'admin') {
                      router.push('/admin')
                    } else if (user.role === 'owner') {
                      router.push('/owner/dashboard')
                    } else {
                      router.push('/game')
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 mb-2"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={logout}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="pt-6 p-6">
            <div className="text-center">
              <div className="mb-6">
                <div className="mb-4 flex justify-center">
                  <img src="/logo.png" alt="Enjoy Bingo" className="w-16 h-16" />
                </div>
                <h1 className="text-3xl font-bold mb-2 text-white">Enjoy Bingo</h1>
                <p className="text-white/70 mb-6">Multiplayer Bingo Game</p>
              </div>
              
              <div className="space-y-4">
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-3 text-lg font-semibold"
                >
                  🎮 Play Now
                </Button>
                
                <div className="text-sm text-white/60 space-y-1">
                  <p>🎲 75-number classic bingo</p>
                  <p>🎯 Real-time multiplayer</p>
                  <p>💰 Betting system</p>
                </div>
                
                <div className="pt-4 border-t border-white/20">
                  <div className="text-xs text-white/50">
                    Games: {games.length} | Active: {games.filter(g => g.status === 'active').length}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {showAuthModal && (
        <UnifiedAuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  )
}