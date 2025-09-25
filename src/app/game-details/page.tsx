'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import TenantCardPreview from '@/components/TenantCardPreview'

interface TenantGame {
  id: string
  status: 'waiting' | 'active' | 'paused' | 'finished'
  current_number?: number
  tenant_id: string
  created_at: string
  player_count?: number
  total_revenue?: number
}

interface TenantPlayer {
  id: string
  player_name: string
  card_number: number
  is_winner: boolean
  tenant_id: string
  created_at: string
}

export default function GameDetailsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tenantId = searchParams.get('tenant')
  const gameId = searchParams.get('game')
  
  const [game, setGame] = useState<TenantGame | null>(null)
  const [players, setPlayers] = useState<TenantPlayer[]>([])
  const [calledNumbers, setCalledNumbers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  const loadGameDetails = async () => {
    if (!tenantId || !gameId) return
    
    setLoading(true)
    try {
      const { tenantService } = await import('@/lib/tenantService')
      const gameResult = await tenantService.getCurrentTenantGame(tenantId)
      
      if (gameResult.success && gameResult.game?.id === gameId) {
        setGame(gameResult.game)
      }

      const playersResponse = await fetch(`/api/tenant-players?gameId=${gameId}&tenantId=${tenantId}`)
      if (playersResponse.ok) {
        const playersData = await playersResponse.json()
        setPlayers(playersData.players || [])
      }

      setCalledNumbers([1, 15, 23, 34, 45, 52, 67])
    } catch (error) {
      console.error('Error loading game details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGameDetails()
  }, [tenantId, gameId])

  if (!tenantId || !gameId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8">
          <CardTitle className="text-white text-center mb-4">⚠️ Invalid Access</CardTitle>
          <p className="text-white/70 text-center">Please provide tenant and game parameters</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8">
          <div className="text-white text-center">Loading game details...</div>
        </Card>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8">
          <CardTitle className="text-white text-center mb-4">🎮 Game Not Found</CardTitle>
          <p className="text-white/70 text-center">The requested game could not be found</p>
          <div className="text-center mt-4">
            <Button onClick={() => router.push(`/game?tenant=${tenantId}`)} className="bg-blue-600 hover:bg-blue-700">
              🔙 Back to Game
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const entryFee = 20
  const totalPot = (game.player_count || players.length) * entryFee
  const platformFee = totalPot * 0.2
  const winnerPrize = totalPot - platformFee

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Enjoy Bingo" className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold text-white">Game Details</h1>
            <p className="text-white/70">Tenant: {tenantId.slice(0, 8)}... | Game: {gameId.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push(`/game?tenant=${tenantId}&game=${gameId}`)} className="bg-blue-600 hover:bg-blue-700">
            🎮 Play Game
          </Button>
          <Button onClick={() => router.push(`/admin?tenant=${tenantId}&game=${gameId}`)} className="bg-purple-600 hover:bg-purple-700">
            ⚙️ Admin
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">📊 Game Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/70">Status</div>
                <div className={`font-bold ${
                  game.status === 'active' ? 'text-green-400' :
                  game.status === 'waiting' ? 'text-yellow-400' :
                  game.status === 'paused' ? 'text-orange-400' : 'text-gray-400'
                }`}>
                  {game.status.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-white/70">Players</div>
                <div className="text-white font-bold">{game.player_count || players.length}</div>
              </div>
              <div>
                <div className="text-white/70">Entry Fee</div>
                <div className="text-green-400 font-bold">{entryFee} ETB</div>
              </div>
              <div>
                <div className="text-white/70">Total Pot</div>
                <div className="text-blue-400 font-bold">{totalPot} ETB</div>
              </div>
              <div>
                <div className="text-white/70">Platform Fee</div>
                <div className="text-red-400 font-bold">{platformFee} ETB</div>
              </div>
              <div>
                <div className="text-white/70">Winner Prize</div>
                <div className="text-yellow-400 font-bold">{winnerPrize} ETB</div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/20">
              <div className="text-white/70 text-sm">Created</div>
              <div className="text-white text-sm">{new Date(game.created_at).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">📢 Called Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            {calledNumbers.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {calledNumbers.map((number) => (
                  <div key={number} className="bg-blue-600 text-white rounded-lg p-2 text-center font-bold">
                    {number <= 15 ? 'B' : 
                     number <= 30 ? 'I' : 
                     number <= 45 ? 'N' : 
                     number <= 60 ? 'G' : 'O'}{number}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📢</div>
                <p className="text-white/60">No numbers called yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">🏆 Winner</CardTitle>
          </CardHeader>
          <CardContent>
            {players.some(p => p.is_winner) ? (
              <div className="text-center">
                {players.filter(p => p.is_winner).map(winner => (
                  <div key={winner.id} className="bg-yellow-600/20 border border-yellow-400 rounded-lg p-4">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-white font-bold">{winner.player_name}</div>
                    <div className="text-white/70 text-sm">Card #{winner.card_number}</div>
                    <div className="text-yellow-400 font-bold mt-2">{winnerPrize} ETB</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎯</div>
                <p className="text-white/60">No winner yet</p>
                <p className="text-white/40 text-sm">Game in progress...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">👥 All Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {players.map((player) => (
                <div key={player.id} className={`rounded-lg p-4 border ${
                  player.is_winner ? 'bg-yellow-600/20 border-yellow-400' : 'bg-white/10 border-white/20'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-white">{player.player_name}</div>
                      <div className="text-white/70 text-sm">Card #{player.card_number}</div>
                    </div>
                    {player.is_winner && (
                      <div className="text-yellow-400 text-2xl">🏆</div>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <TenantCardPreview cardNumber={player.card_number} tenantId={tenantId} className="scale-75 origin-left" />
                  </div>
                  
                  <div className="text-xs text-white/60">
                    Joined: {new Date(player.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-white/60 text-xl">No players in this game</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}