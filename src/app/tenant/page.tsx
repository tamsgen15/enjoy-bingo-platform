'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import TenantAuth from '@/components/TenantAuth'
import { enhancedTenantService, type Tenant, type TenantGame } from '@/lib/enhancedTenantService'
import { supabase } from '@/lib/supabase'

export default function TenantDashboard() {
  const searchParams = useSearchParams()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null)
  const [games, setGames] = useState<TenantGame[]>([])
  const [currentGame, setCurrentGame] = useState<TenantGame | null>(null)
  const [revenue, setRevenue] = useState({
    total: 0,
    gamesCount: 0,
    playersCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

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

  const loadTenantFromParam = async (tenantId: string) => {
    try {
      const { data: subscriptionData } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()
      
      if (subscriptionData) {
        // Set tenant in enhanced service from URL parameter data
        const success = await enhancedTenantService.setTenantFromData(subscriptionData)
        
        if (success) {
          const tenant = enhancedTenantService.getCurrentTenant()
          if (tenant) {
            setTenant({
              tenant_id: tenant.id,
              tenant_name: tenant.tenant_name,
              admin_email: tenant.admin_email
            } as any)
          }
        } else {
          // Fallback to direct tenant data
          const tenantData = {
            tenant_id: subscriptionData.tenant_id,
            tenant_name: subscriptionData.tenant_name,
            admin_email: subscriptionData.admin_email
          }
          setTenant(tenantData as any)
        }
      }
    } catch (error) {
      console.error('Load tenant from param error:', error)
    } finally {
      setInitializing(false)
    }
  }

  // Check for existing tenant session using database only
  const checkExistingSession = async () => {
    try {
      console.log('🔍 Checking existing session...')
      
      // Check for active user sessions in database
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false })
        .limit(1)
      
      if (!error && sessions && sessions.length > 0) {
        console.log('📊 Found active user session:', sessions[0])
        const session = sessions[0]
        
        // Get tenant data from platform_subscriptions
        const { data: tenantData } = await supabase
          .from('platform_subscriptions')
          .select('*')
          .eq('admin_email', session.user_email)
          .single()
        
        if (tenantData) {
          const tenantObj = {
            tenant_id: tenantData.tenant_id,
            tenant_name: tenantData.tenant_name,
            admin_email: tenantData.admin_email
          }
          setTenant(tenantObj as any)
          console.log('📊 Tenant data loaded from database session:', tenantObj)
        }
      } else {
        console.log('❌ No active user sessions found')
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setInitializing(false)
    }
  }
  
  useEffect(() => {
    if (tenant) {
      loadTenantData()
      
      // Setup realtime subscriptions for tenant data
      const { supabase } = require('@/lib/supabase')
      
      const tenantId = (tenant as any).tenant_id || (tenant as any).id
      
      const subscriptionChannel = supabase
        .channel(`tenant_subscription_${tenantId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'platform_subscriptions',
          filter: `tenant_id=eq.${tenantId}`
        }, () => {
          loadTenantData()
        })
        .subscribe()
      
      const gamesChannel = supabase
        .channel(`tenant_games_${tenantId}_${(tenant as any).admin_email}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `tenant_id=eq.${tenantId}&admin_id=eq.${(tenant as any).admin_email}`
        }, () => {
          loadTenantData()
        })
        .subscribe()
      
      const playersChannel = supabase
        .channel(`tenant_players_${tenantId}_${(tenant as any).admin_email}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `tenant_id=eq.${tenantId}`
        }, async (payload: any) => {
          // Only reload if player belongs to current user's game
          if (payload.new?.game_id) {
            const { data: gameData } = await supabase
              .from('games')
              .select('admin_id')
              .eq('id', payload.new.game_id)
              .single()
            
            if (gameData?.admin_id === (tenant as any).admin_email) {
              loadTenantData()
            }
          } else {
            loadTenantData()
          }
        })
        .subscribe()
      
      return () => {
        supabase.removeChannel(subscriptionChannel)
        supabase.removeChannel(gamesChannel)
        supabase.removeChannel(playersChannel)
      }
    }
  }, [tenant])

  const loadTenantData = async () => {
    if (!tenant) {
      console.log('❌ No tenant data available for loading')
      return
    }
    
    console.log('📊 Loading data for tenant:', tenant)
    setLoading(true)
    try {
      // Load subscription status from database
      const { data: subscriptionData } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .eq('admin_email', (tenant as any).admin_email)
        .single()
      
      if (subscriptionData) {
        const daysRemaining = subscriptionData.end_date ? 
          Math.max(0, Math.ceil(((new Date(subscriptionData.end_date) as any) - (new Date() as any)) / (1000 * 60 * 60 * 24))) : 0
        
        setSubscriptionStatus({
          success: true,
          status: subscriptionData.subscription_status,
          days_remaining: daysRemaining,
          end_date: subscriptionData.end_date
        })
      }

      // Get all games for this tenant with platform fee data
      const tenantId = (tenant as any).tenant_id || (tenant as any).id
      if (!tenantId) {
        console.log('❌ No tenant_id available, skipping games query')
        setGames([])
        setRevenue({ total: 0, gamesCount: 0, playersCount: 0 })
        return
      }
      
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          players(count)
        `)
        .eq('tenant_id', tenantId)
        .eq('admin_id', (tenant as any).admin_email)
        .order('created_at', { ascending: false })
      
      if (gamesError) {
        console.error('Games query error:', gamesError)
      }
      
      const games = gamesData?.map(game => {
        const playerCount = game.players?.[0]?.count || 0
        const entryFee = game.entry_fee || 20
        const platformFeePercent = game.platform_fee_percent || 20
        const totalPot = playerCount * entryFee
        const tenantRevenue = Math.round(totalPot * (platformFeePercent / 100))
        
        return {
          ...game,
          player_count: playerCount,
          total_revenue: tenantRevenue,
          platform_fee_percent: platformFeePercent
        }
      }) || []
      
      setGames(games)
      
      // Calculate total stats based on tenant's platform fee settings
      const totalPlayers = games.reduce((sum, game) => sum + (game.player_count || 0), 0)
      const totalRevenue = games.reduce((sum, game) => sum + (game.total_revenue || 0), 0)
      
      setRevenue({
        total: totalRevenue,
        gamesCount: games.length,
        playersCount: totalPlayers
      })
      
      // Get current game from games data
      const activeGame = games.find(game => game.status !== 'finished')
      setCurrentGame(activeGame || null)
      
    } catch (error) {
      console.error('Load tenant data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGame = async () => {
    if (!tenant) return

    try {
      const tenantId = (tenant as any).tenant_id || (tenant as any).id
      const deviceId = `${navigator.userAgent}_${Date.now()}`
      
      const { data, error } = await supabase.rpc('create_tenant_game_isolated', {
        p_tenant_id: tenantId,
        p_admin_email: (tenant as any).admin_email,
        p_device_id: deviceId
      })
      
      if (error || !data?.success) {
        alert('Failed to create game: ' + (error?.message || data?.error || 'Unknown error'))
      } else {
        loadTenantData()
        alert('Game created successfully!')
      }
    } catch (error) {
      console.error('Create game error:', error)
      alert('Failed to create game: Network error')
    }
  }

  const handleLogout = async () => {
    // Deactivate user session in database
    if (tenant) {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_email', (tenant as any).admin_email)
    }
    
    setTenant(null)
    setSubscriptionStatus(null)
    setGames([])
    setCurrentGame(null)
    setRevenue({ total: 0, gamesCount: 0, playersCount: 0 })
  }

  const getDaysRemaining = () => {
    if (!subscriptionStatus?.days_remaining) return 0
    return Math.max(0, subscriptionStatus.days_remaining)
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
    return <TenantAuth onTenantAuthenticated={(tenantData) => {
      setTenant(tenantData)
      setInitializing(false)
    }} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-xl text-white">Loading tenant dashboard...</div>
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
              <h1 className="text-3xl font-bold text-white mb-2">{tenant.tenant_name}</h1>
              <p className="text-white/70">Tenant Dashboard - {tenant.admin_email}</p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://t.me/enjoybingogroup"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                📱 Support
              </a>
              <button
                onClick={async () => {
                  await handleLogout()
                  window.location.href = '/'
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Subscription Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">Status</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscriptionStatus?.status || 'unknown')}`}>
                {subscriptionStatus?.status || 'Unknown'}
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">Days Remaining</p>
              <p className="text-2xl font-bold text-blue-400">{getDaysRemaining()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">Monthly Fee</p>
              <p className="text-2xl font-bold text-green-400">20,000 ETB</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">End Date</p>
              <p className="text-lg font-semibold text-white">
                {subscriptionStatus?.end_date ? 
                  new Date(subscriptionStatus.end_date).toLocaleDateString() : 
                  'N/A'
                }
              </p>
            </div>
          </div>
          
          {subscriptionStatus?.status !== 'active' && (
            <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
              <p className="text-yellow-200">
                Your subscription is {subscriptionStatus?.status}. 
                Please contact the platform owner to renew your subscription.
              </p>
            </div>
          )}
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-400">{revenue.total.toLocaleString()} ETB</p>
            <p className="text-sm text-white/60 mt-1">From {revenue.playersCount} players (Platform fee: 0%-50%)</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">Games Hosted</h3>
            <p className="text-3xl font-bold text-blue-400">{revenue.gamesCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">Total Players</h3>
            <p className="text-3xl font-bold text-purple-400">{revenue.playersCount}</p>
          </div>
        </div>

        {/* Current Game */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Current Game</h2>
            {subscriptionStatus?.status === 'active' && !currentGame && (
              <button
                onClick={handleCreateGame}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Create New Game
              </button>
            )}
          </div>

          {currentGame ? (
            <div className="border border-white/20 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-white/70">Game ID</p>
                  <p className="font-mono text-sm text-white">{currentGame.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Status</p>
                  <span className={`px-2 py-1 rounded text-sm ${
                    currentGame.status === 'active' ? 'bg-green-100 text-green-800' :
                    currentGame.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentGame.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white/70">Players</p>
                  <p className="text-lg font-semibold text-white">{currentGame.player_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Revenue</p>
                  <p className="text-lg font-semibold text-green-400">
                    {(currentGame.total_revenue || 0).toLocaleString()} ETB
                  </p>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <a
                  href={`/admin?tenant=${(tenant as any).tenant_id || (tenant as any).id}&game=${currentGame.id}&session=${currentGame.session_id || 'new'}`}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block w-full text-center"
                  onClick={async (e) => {
                    e.preventDefault()
                    const tenantId = (tenant as any).tenant_id || (tenant as any).id
                    // Log admin access activity
                    await supabase.rpc('log_user_activity', {
                      p_tenant_id: tenantId,
                      p_user_email: (tenant as any).admin_email,
                      p_activity_type: 'admin_access',
                      p_page_url: `/admin?tenant=${tenantId}&game=${currentGame.id}&session=${currentGame.session_id || 'new'}`,
                      p_device_info: navigator.userAgent
                    })
                    window.location.href = `/admin?tenant=${tenantId}&game=${currentGame.id}&session=${currentGame.session_id || 'new'}`
                  }}
                >
                  🎮 Manage Game
                </a>
                <button
                  onClick={async () => {
                    if (confirm('End all ongoing games? This cannot be undone.')) {
                      try {
                        const tenantId = (tenant as any).tenant_id || (tenant as any).id
                        const { data, error } = await supabase.rpc('end_tenant_user_games_isolated', {
                          p_tenant_id: tenantId,
                          p_user_email: (tenant as any).admin_email
                        })
                        
                        if (error || !data?.success) {
                          alert('Failed to end games: ' + (error?.message || data?.error || 'Unknown error'))
                        } else {
                          alert(`Ended ${data.games_ended || 0} games`)
                          loadTenantData()
                        }
                      } catch (error) {
                        alert('Failed to end games: Network error')
                      }
                    }
                  }}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors w-full"
                >
                  🏁 End All Games
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              {subscriptionStatus?.status === 'active' ? 
                'No active game. Create a new game to start.' :
                'Subscription required to create games.'
              }
            </div>
          )}
        </div>

        {/* Games History */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Games History</h2>
            <button
              onClick={async () => {
                if (confirm('End ALL ongoing games? This will affect all your games.')) {
                  try {
                    const tenantId = (tenant as any).tenant_id || (tenant as any).id
                    const { data, error } = await supabase.rpc('end_tenant_user_games_isolated', {
                      p_tenant_id: tenantId,
                      p_user_email: (tenant as any).admin_email
                    })
                    
                    if (error || !data?.success) {
                      alert('Failed to end games: ' + (error?.message || data?.error || 'Unknown error'))
                    } else {
                      alert(`Ended ${data.games_ended || 0} games, cleared ${data.players_cleared || 0} players`)
                      loadTenantData()
                    }
                  } catch (error) {
                    alert('Failed to end games: Network error')
                  }
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              🚨 End All Games
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/10">
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Game ID</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Status</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Players</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Revenue</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Platform Fee</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Created</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td className="border border-white/20 px-4 py-2 font-mono text-sm text-white">
                      {game.id.slice(0, 8)}...
                    </td>
                    <td className="border border-white/20 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        game.status === 'active' ? 'bg-green-100 text-green-800' :
                        game.status === 'finished' ? 'bg-blue-100 text-blue-800' :
                        game.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {game.status}
                      </span>
                    </td>
                    <td className="border border-white/20 px-4 py-2 text-white">{game.player_count || 0}</td>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      {(game.total_revenue || 0).toLocaleString()} ETB
                    </td>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {game.platform_fee_percent || 20}%
                      </span>
                    </td>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      {new Date(game.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}