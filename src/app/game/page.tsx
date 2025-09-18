'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/UnifiedAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/ProtectedRoute'

function GamesPage() {
  const [games, setGames] = useState<any[]>([])
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const { data } = await supabase
        .from('games')
        .select(`
          *,
          players:players(count)
        `)
        .order('created_at', { ascending: false })
      setGames(data || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  const createNewGame = async () => {
    try {
      const { data } = await supabase.from('games').insert({
        status: 'waiting',
        max_players: 100
      }).select().single()
      
      if (data) {
        router.push(`/game/${data.id}`)
      }
    } catch (error) {
      console.error('Error creating game:', error)
      alert('Failed to create game')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              🎮 Bingo Games
            </h1>
            <p className="text-white/70 mt-1">Welcome back, {user?.username}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={createNewGame} 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
            >
              🎲 New Game
            </Button>
            <Button 
              onClick={() => router.push('/admin')} 
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
            >
              🔧 Admin
            </Button>
            <Button 
              onClick={logout} 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Game #{game.id.slice(0, 8)}</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    game.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    game.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' : 
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {game.status === 'active' ? '🔴 Live' : 
                     game.status === 'waiting' ? '⏳ Waiting' : '✅ Finished'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Players:</span>
                    <span className="text-white font-medium">{game.players?.[0]?.count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Created:</span>
                    <span className="text-white font-medium">
                      {new Date(game.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Prize Pool:</span>
                    <span className="text-yellow-400 font-bold">
                      {(game.players?.[0]?.count || 0) * 20} ETB
                    </span>
                  </div>
                  
                  <Button 
                    onClick={() => router.push(`/game/${game.id}`)}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    {game.status === 'waiting' ? '🎯 Join Game' : '👁️ View Game'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {games.length === 0 && (
            <div className="col-span-full">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-4">🎲</div>
                  <h3 className="text-xl font-bold text-white mb-2">No Games Available</h3>
                  <p className="text-white/70 mb-6">Be the first to create a bingo game!</p>
                  <Button 
                    onClick={createNewGame} 
                    className="bg-green-600 hover:bg-green-700 px-8 py-3"
                  >
                    🎲 Create First Game
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  return <GamesPage />
}