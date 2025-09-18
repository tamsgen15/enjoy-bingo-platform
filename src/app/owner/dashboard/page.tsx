'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/UnifiedAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProtectedRoute from '@/components/ProtectedRoute'

interface DashboardStats {
  totalGames: number
  activeGames: number
  totalPlayers: number
  todayRevenue: number
  totalRevenue: number
  platformRevenue: number
}

function OwnerDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats>({
    totalGames: 0,
    activeGames: 0,
    totalPlayers: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    platformRevenue: 0
  })
  const [games, setGames] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [platformSettings, setPlatformSettings] = useState({
    platformFee: 20,
    entryFee: 20
  })

  useEffect(() => {
    fetchAllData()
    subscribeToRealtimeUpdates()
  }, [])

  const fetchAllData = async () => {
    try {
      const [gamesRes, playersRes] = await Promise.all([
        supabase.from('games').select('*').order('created_at', { ascending: false }),
        supabase.from('players').select('*').order('created_at', { ascending: false })
      ])

      const gamesData = gamesRes.data || []
      const playersData = playersRes.data || []

      setGames(gamesData)
      setPlayers(playersData)
      calculateStats(gamesData, playersData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const subscribeToRealtimeUpdates = () => {
    const gamesChannel = supabase
      .channel('owner-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchAllData)
      .subscribe()

    const playersChannel = supabase
      .channel('owner-players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchAllData)
      .subscribe()

    return () => {
      supabase.removeChannel(gamesChannel)
      supabase.removeChannel(playersChannel)
    }
  }

  const calculateStats = (gamesData: any[], playersData: any[]) => {
    const totalRevenue = playersData.length * 20
    const platformRevenue = Math.floor(totalRevenue * (platformSettings.platformFee / 100))

    setStats({
      totalGames: gamesData.length,
      activeGames: gamesData.filter((g: any) => g.status === 'active').length,
      totalPlayers: playersData.length,
      todayRevenue: platformRevenue,
      totalRevenue,
      platformRevenue
    })
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'games', label: 'Games', icon: '🎮' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'revenue', label: 'Revenue', icon: '💰' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                🏢 Owner Dashboard
              </h1>
              <p className="text-white/70">Welcome back, {user?.username}</p>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              className={`${
                activeTab === tab.id 
                  ? 'bg-white/20 text-white border-white/30' 
                  : 'border-white/30 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </Button>
          ))}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-2">{stats.totalGames}</div>
                  <div className="text-white/70">Total Games</div>
                  <div className="text-sm text-white/50 mt-1">
                    Active: {stats.activeGames}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">{stats.activeGames}</div>
                  <div className="text-white/70">Active Games</div>
                  <div className="text-sm text-green-400 mt-1">
                    {stats.activeGames > 0 ? '🔴 Live' : 'No active games'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{stats.totalPlayers}</div>
                  <div className="text-white/70">Total Players</div>
                  <div className="text-sm text-blue-400 mt-1">
                    All time players
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">{stats.platformRevenue}</div>
                  <div className="text-white/70">Platform Revenue</div>
                  <div className="text-sm text-yellow-400 mt-1">
                    {platformSettings.platformFee}% fee
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Summary */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">📈 Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.totalRevenue} ETB</div>
                    <div className="text-white/70">Total Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.platformRevenue} ETB</div>
                    <div className="text-white/70">Platform Fee ({platformSettings.platformFee}%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{platformSettings.entryFee} ETB</div>
                    <div className="text-white/70">Entry Fee per Player</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'games' && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">🎮 Games Management ({games.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {games.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎮</div>
                    <p className="text-white/50">No games found</p>
                  </div>
                ) : (
                  games.slice(0, 10).map(game => {
                    const gamePlayers = players.filter((p: any) => p.game_id === game.id)
                    return (
                      <div key={game.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                          <div className="font-medium text-white">Game #{game.id.slice(0, 8)}</div>
                          <div className="text-sm text-white/70">
                            {gamePlayers.length} players • {new Date(game.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className={
                          game.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          game.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-gray-500/20 text-gray-400'
                        }>
                          {game.status === 'active' ? '🔴 Active' : game.status === 'waiting' ? '⏳ Waiting' : 'Finished'}
                        </Badge>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">👥 User Management ({players.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {players.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">👥</div>
                    <p className="text-white/50">No players found</p>
                  </div>
                ) : (
                  players.slice(0, 10).map(player => (
                    <div key={player.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <div className="font-medium text-white">{player.player_name}</div>
                        <div className="text-sm text-white/70">
                          Card #{player.selected_card_number} • {new Date(player.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-400">20 ETB</div>
                        {player.is_winner && (
                          <Badge className="bg-yellow-500/20 text-yellow-400">🏆 Winner</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'revenue' && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">💰 Platform Fee Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="platformFee" className="text-white mb-2 block">Platform Fee (%)</Label>
                <Input
                  id="platformFee"
                  type="number"
                  min="0"
                  max="50"
                  value={platformSettings.platformFee}
                  onChange={(e) => setPlatformSettings(prev => ({ 
                    ...prev, 
                    platformFee: Number(e.target.value) 
                  }))}
                  className="bg-white/20 border-white/30 text-white"
                />
              </div>
              <Button 
                onClick={() => {
                  calculateStats(games, players)
                  alert('Settings updated successfully')
                }} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                Update Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">🔐 Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="text-white/70">
                  <strong>Username:</strong> {user?.username}
                </div>
                <div className="text-white/70">
                  <strong>Role:</strong> {user?.role}
                </div>
                <div className="text-white/70">
                  <strong>Access Level:</strong> Platform Owner
                </div>
              </div>
              <Button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
              >
                Logout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function OwnerDashboardPage() {
  return <OwnerDashboard />
}