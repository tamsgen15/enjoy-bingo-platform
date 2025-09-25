'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { enhancedTenantService, type Tenant, type TenantGame } from '@/lib/enhancedTenantService'
import { supabase } from '@/lib/supabase'

interface TenantStats {
  total_revenue: number
  games_count: number
  players_count: number
  active_sessions: number
}

export default function EnhancedTenantDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [games, setGames] = useState<TenantGame[]>([])
  const [currentGame, setCurrentGame] = useState<TenantGame | null>(null)
  const [stats, setStats] = useState<TenantStats>({
    total_revenue: 0,
    games_count: 0,
    players_count: 0,
    active_sessions: 0
  })
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [email, setEmail] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Check for existing session on load
  useEffect(() => {
    const tenantParam = searchParams.get('tenant')
    const fromParam = searchParams.get('from')
    
    if (tenantParam && fromParam === 'admin') {
      // Coming from admin page with tenant context
      loadTenantFromParam(tenantParam)
    } else {
      checkExistingSession()
    }
  }, [])

  // Load tenant data when authenticated
  useEffect(() => {
    if (tenant) {
      loadTenantData()
      setupRealtimeSubscriptions()
    }
  }, [tenant])

  const loadTenantFromParam = async (tenantId: string) => {
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()
      
      if (tenantData) {
        const result = await enhancedTenantService.authenticateTenant(tenantData.admin_email)
        if (result.success && result.tenant) {
          setTenant(result.tenant)
        }
      }
    } catch (error) {
      console.error('Load tenant from param error:', error)
    } finally {
      setInitializing(false)
    }
  }

  const checkExistingSession = async () => {
    try {
      const { data: sessions } = await supabase
        .from('tenant_sessions')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity', { ascending: false })
        .limit(1)
      
      if (sessions && sessions.length > 0) {
        const session = sessions[0]
        
        // Authenticate with existing session
        const result = await enhancedTenantService.authenticateTenant(session.user_email)
        if (result.success && result.tenant) {
          setTenant(result.tenant)
        }
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setInitializing(false)
    }
  }

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      const result = await enhancedTenantService.authenticateTenant(email)
      
      if (result.success && result.tenant) {
        setTenant(result.tenant)
        setEmail('')
        
        // Log authentication
        await enhancedTenantService.logActivity('tenant_authenticated', window.location.href)
      } else {
        setAuthError(result.error || 'Authentication failed')
      }
    } catch (error) {
      setAuthError('Authentication failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const loadTenantData = async () => {
    setLoading(true)
    try {
      // Load current game
      const gameResult = await enhancedTenantService.getCurrentTenantGame()
      if (gameResult.success && gameResult.game) {
        setCurrentGame(gameResult.game)
      }

      // Load all games
      const gamesResult = await enhancedTenantService.getTenantGames()
      if (gamesResult.success && gamesResult.games) {
        setGames(gamesResult.games)
      }

      // Load revenue stats
      const revenueResult = await enhancedTenantService.getTenantRevenue()
      if (revenueResult.success) {
        setStats(prev => ({
          ...prev,
          total_revenue: revenueResult.total_revenue || 0,
          games_count: revenueResult.games_count || 0,
          players_count: revenueResult.players_count || 0
        }))
      }

      // Load active sessions count
      const { count: sessionsCount } = await supabase
        .from('tenant_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant?.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())

      setStats(prev => ({
        ...prev,
        active_sessions: sessionsCount || 0
      }))

    } catch (error) {
      console.error('Load tenant data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscriptions = () => {
    if (!tenant) return

    // Subscribe to tenant-specific changes
    const gameSubscription = supabase
      .channel(`tenant_dashboard_${tenant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `tenant_id=eq.${tenant.id}&admin_id=eq.${tenant.admin_email}`
      }, () => {
        loadTenantData()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `tenant_id=eq.${tenant.id}`
      }, () => {
        loadTenantData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gameSubscription)
    }
  }

  const handleCreateGame = async () => {
    if (!tenant) return

    try {
      const result = await enhancedTenantService.createTenantGame()
      
      if (result.success && result.game) {
        setCurrentGame(result.game)
        await loadTenantData()
        
        // Log game creation
        await enhancedTenantService.logActivity('game_created', window.location.href, {
          game_id: result.game.id
        })
        
        alert('Game created successfully!')
      } else {
        alert(result.error || 'Failed to create game')
      }
    } catch (error) {
      console.error('Create game error:', error)
      alert('Failed to create game')
    }
  }

  const handleEndAllGames = async () => {
    if (!tenant || !confirm('End ALL your ongoing games? This cannot be undone.')) return

    try {
      const result = await enhancedTenantService.endTenantUserGames()
      
      if (result.success) {
        setCurrentGame(null)
        await loadTenantData()
        
        // Log games termination
        await enhancedTenantService.logActivity('games_terminated', window.location.href, {
          games_ended: result.games_ended,
          players_cleared: result.players_cleared
        })
        
        alert(`Ended ${result.games_ended} games and cleared ${result.players_cleared} players`)
      } else {
        alert(result.error || 'Failed to end games')
      }
    } catch (error) {
      console.error('End games error:', error)
      alert('Failed to end games')
    }
  }

  const handleLogout = async () => {
    await enhancedTenantService.logout()
    setTenant(null)
    setCurrentGame(null)
    setGames([])
    setStats({
      total_revenue: 0,
      games_count: 0,
      players_count: 0,
      active_sessions: 0
    })
  }

  const getSubscriptionDaysRemaining = () => {
    if (!tenant?.subscription_end_date) return 0
    const endDate = new Date(tenant.subscription_end_date)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'expired': return 'text-red-600 bg-red-100'
      case 'suspended': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-xl text-white">Checking session...</div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Enhanced Tenant Access</h1>
            <p className="text-white/70">Complete Multi-Tenant Isolation Platform</p>
          </div>

          <form onSubmit={handleAuthentication} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Admin Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your registered email"
                required
                disabled={authLoading}
              />
            </div>

            {authError && (
              <div className="bg-red-500/20 border border-red-400/50 text-red-300 px-4 py-3 rounded-lg">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {authLoading ? 'Authenticating...' : 'Access Platform'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white/60">
            <p>✨ Complete tenant isolation with real-time updates</p>
            <p className="mt-2">Monthly subscription: <span className="font-semibold text-green-400">20,000 ETB</span></p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-xl text-white">Loading enhanced dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🏢 {tenant.tenant_name}
              </h1>
              <p className="text-white/70">
                Enhanced Multi-Tenant Dashboard - {tenant.admin_email}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tenant.subscription_status)}`}>
                  {tenant.subscription_status.toUpperCase()}
                </span>
                <span className="text-white/60 text-sm">
                  {getSubscriptionDaysRemaining()} days remaining
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                🏠 Home
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">💰 Total Revenue</h3>
            <p className="text-3xl font-bold text-green-400">{stats.total_revenue.toLocaleString()} ETB</p>
            <p className="text-sm text-white/60 mt-1">From {stats.players_count} players</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">🎮 Games Hosted</h3>
            <p className="text-3xl font-bold text-blue-400">{stats.games_count}</p>
            <p className="text-sm text-white/60 mt-1">Total games created</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">👥 Total Players</h3>
            <p className="text-3xl font-bold text-purple-400">{stats.players_count}</p>
            <p className="text-sm text-white/60 mt-1">Across all games</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">🔗 Active Sessions</h3>
            <p className="text-3xl font-bold text-orange-400">{stats.active_sessions}</p>
            <p className="text-sm text-white/60 mt-1">Multi-device support</p>
          </div>
        </div>

        {/* Current Game */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">🎯 Current Game</h2>
            {tenant.subscription_status === 'active' && !currentGame && (
              <button
                onClick={handleCreateGame}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                🎲 Create New Game
              </button>
            )}
          </div>

          {currentGame ? (
            <div className="border border-white/20 rounded-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <p className="text-sm text-white/70 mb-1">Game ID</p>
                  <p className="font-mono text-sm text-white">{currentGame.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-white/70 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    currentGame.status === 'active' ? 'bg-green-100 text-green-800' :
                    currentGame.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentGame.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white/70 mb-1">Players</p>
                  <p className="text-2xl font-bold text-white">{currentGame.player_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70 mb-1">Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    {(currentGame.total_revenue || 0).toLocaleString()} ETB
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href={`/admin/enhanced?tenant=${tenant.id}&game=${currentGame.id}`}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
                  onClick={async (e) => {
                    e.preventDefault()
                    await enhancedTenantService.logActivity('admin_access', `/admin/enhanced?tenant=${tenant.id}&game=${currentGame.id}`)
                    window.location.href = `/admin/enhanced?tenant=${tenant.id}&game=${currentGame.id}`
                  }}
                >
                  🎮 Manage Game
                </a>
                <button
                  onClick={handleEndAllGames}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  🏁 End All Games
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl mb-2">
                {tenant.subscription_status === 'active' ? 
                  'No active game. Create a new game to start.' :
                  'Subscription required to create games.'
                }
              </p>
              <p className="text-sm">Complete tenant isolation ensures your data privacy</p>
            </div>
          )}
        </div>

        {/* Games History */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">📊 Games History</h2>
            <div className="flex gap-3">
              <button
                onClick={() => loadTenantData()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleEndAllGames}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
              >
                🚨 End All Games
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/10">
                  <th className="border border-white/20 px-4 py-3 text-left text-white font-medium">Game ID</th>
                  <th className="border border-white/20 px-4 py-3 text-left text-white font-medium">Status</th>
                  <th className="border border-white/20 px-4 py-3 text-left text-white font-medium">Players</th>
                  <th className="border border-white/20 px-4 py-3 text-left text-white font-medium">Revenue</th>
                  <th className="border border-white/20 px-4 py-3 text-left text-white font-medium">Created</th>
                  <th className="border border-white/20 px-4 py-3 text-left text-white font-medium">Session</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="hover:bg-white/5">
                    <td className="border border-white/20 px-4 py-3 font-mono text-sm text-white">
                      {game.id.slice(0, 8)}...
                    </td>
                    <td className="border border-white/20 px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        game.status === 'active' ? 'bg-green-100 text-green-800' :
                        game.status === 'finished' ? 'bg-blue-100 text-blue-800' :
                        game.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {game.status}
                      </span>
                    </td>
                    <td className="border border-white/20 px-4 py-3 text-white font-medium">
                      {game.player_count || 0}
                    </td>
                    <td className="border border-white/20 px-4 py-3 text-green-400 font-medium">
                      {(game.total_revenue || 0).toLocaleString()} ETB
                    </td>
                    <td className="border border-white/20 px-4 py-3 text-white text-sm">
                      {new Date(game.created_at).toLocaleDateString()}
                    </td>
                    <td className="border border-white/20 px-4 py-3 font-mono text-xs text-white/70">
                      {game.session_id?.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {games.length === 0 && (
              <div className="text-center py-8 text-white/60">
                <div className="text-4xl mb-4">📊</div>
                <p>No games created yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}