'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/UnifiedAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import TenantNumberBoard from '@/components/TenantNumberBoard'
import GameStatus from '@/components/GameStatus'
import WinnerModal from '@/components/WinnerModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import TenantAutoCallerStatus from '@/components/TenantAutoCallerStatus'
import { databaseService, GameState, Player, CalledNumber } from '@/lib/databaseService'
import { tenantAutomaticNumberCaller } from '@/lib/TenantAutomaticNumberCaller'
import { tenantService } from '@/lib/tenantService'
import { supabase } from '@/lib/supabase'
import { tenantAudioManager } from '@/lib/TenantAudioManager'

function CardPreview({ cardNumber }: { cardNumber: number }) {
  const [cardData, setCardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchCard = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('bingo_cards')
          .select('*')
          .eq('card_number', cardNumber)
          .single()
        
        if (error) {
          setError('Card not found')
          return
        }
        
        if (data) {
          setCardData({
            b: data.b_column || [],
            i: data.i_column || [],
            n: [...(data.n_column || []).slice(0, 2), 'FREE', ...(data.n_column || []).slice(2)],
            g: data.g_column || [],
            o: data.o_column || []
          })
        }
      } catch (error) {
        console.error('Error fetching card:', error)
        setError('Failed to load card')
      } finally {
        setLoading(false)
      }
    }
    
    if (cardNumber) {
      fetchCard()
    }
  }, [cardNumber])

  if (loading) {
    return (
      <div className="border-2 border-white/30 rounded-lg p-4 bg-white/10 backdrop-blur-lg w-fit">
        <div className="text-center text-white text-sm mb-2">Loading Card #{cardNumber}...</div>
        <div className="animate-pulse">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({length: 30}, (_, i) => (
              <div key={i} className="w-10 h-8 bg-white/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !cardData) {
    return (
      <div className="border-2 border-red-500/50 rounded-lg p-4 bg-red-500/10 backdrop-blur-lg w-fit">
        <div className="text-center text-red-400 text-sm">Card #{cardNumber}</div>
        <div className="text-center text-red-300 text-xs mt-1">{error || 'No data'}</div>
      </div>
    )
  }

  return (
    <div className="border-2 border-white/30 rounded-lg p-4 bg-white/10 backdrop-blur-lg shadow-lg w-fit">
      <div className="text-center text-lg font-bold mb-3 text-white">Card #{cardNumber}</div>
      <div className="grid grid-cols-5 gap-1">
        <div className="font-bold text-center bg-blue-600 text-white w-10 h-8 rounded flex items-center justify-center text-sm">B</div>
        <div className="font-bold text-center bg-red-600 text-white w-10 h-8 rounded flex items-center justify-center text-sm">I</div>
        <div className="font-bold text-center bg-yellow-600 text-white w-10 h-8 rounded flex items-center justify-center text-sm">N</div>
        <div className="font-bold text-center bg-green-600 text-white w-10 h-8 rounded flex items-center justify-center text-sm">G</div>
        <div className="font-bold text-center bg-orange-600 text-white w-10 h-8 rounded flex items-center justify-center text-sm">O</div>
        
        {[0,1,2,3,4].map(row => 
          [cardData.b[row], cardData.i[row], cardData.n[row], cardData.g[row], cardData.o[row]].map((num, col) => (
            <div key={`${row}-${col}`} className={`text-center w-10 h-8 border border-white/30 rounded flex items-center justify-center text-sm font-medium ${
              num === 'FREE' ? 'bg-yellow-500 font-bold text-black' : 'bg-white/20 text-white hover:bg-white/30'
            }`}>
              {num === 'FREE' ? '★' : num}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Always require tenant ID - redirect if missing
  const tenantId = searchParams.get('tenant')
  const gameId = searchParams.get('game')
  const urlSessionId = searchParams.get('session')
  
  useEffect(() => {
    if (!tenantId) {
      router.push('/tenant')
      return
    }
    
    // Set session ID from URL if provided
    if (urlSessionId && urlSessionId !== 'none') {
      setSessionId(urlSessionId)
    }
    
    // Load tenant name from real-time database
    const loadTenantName = async () => {
      try {
        const { data } = await supabase
          .from('platform_subscriptions')
          .select('tenant_name')
          .eq('tenant_id', tenantId)
          .single()
        
        if (data?.tenant_name) {
          setTenantName(data.tenant_name)
          
          // Log page access activity
          await supabase.rpc('log_user_activity', {
            p_tenant_id: tenantId,
            p_user_email: (user as any)?.email || 'unknown',
            p_activity_type: 'admin_access',
            p_page_url: window.location.href,
            p_device_info: navigator.userAgent
          })
        }
      } catch (error) {
        console.error('Error loading tenant name:', error)
      }
    }
    
    loadTenantName()
  }, [tenantId, router]) // Removed urlSessionId to prevent dependency array size changes
  
  // Return early if no tenant ID
  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Redirecting to tenant selection...</div>
      </div>
    )
  }
  
  const [currentGame, setCurrentGame] = useState<GameState | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [calledNumbers, setCalledNumbers] = useState<CalledNumber[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  
  const [showCardSelection, setShowCardSelection] = useState(false)
  const [winnerCardNumber, setWinnerCardNumber] = useState('')
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [winner, setWinner] = useState<any>(null)
  const [playerName, setPlayerName] = useState('')
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [showPlatformFeeModal, setShowPlatformFeeModal] = useState(false)
  const [newPlatformFee, setNewPlatformFee] = useState('')
  const [newEntryFee, setNewEntryFee] = useState('')
  const [realtimeCallStatus, setRealtimeCallStatus] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string>('')
  const [callInterval, setCallInterval] = useState<number>(6)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollPreview = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const cardWidth = 200 // Approximate card width
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  // Real-time subscriptions using database service with tenant support
  useEffect(() => {
    if (!currentGame?.id) return

    // Setup realtime subscriptions with tenant and session filtering
    const gameChannel = supabase
      .channel(`admin_game_${tenantId}_${currentGame.id}_${sessionId || 'default'}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${currentGame.id}`
      }, (payload) => {
        // Only update if this is our tenant's game
        if (payload.new.id === currentGame.id && payload.new.tenant_id === tenantId) {
          setCurrentGame(payload.new as GameState)
          setCurrentNumber(payload.new.current_number)
          if (payload.new.session_id && !sessionId) {
            setSessionId(payload.new.session_id)
          }
        }
      })
      .subscribe()

    let playersFilter = `game_id=eq.${currentGame.id}`
    if (tenantId) {
      playersFilter += `&tenant_id=eq.${tenantId}`
    }

    const playersChannel = supabase
      .channel(`admin_players_${tenantId}_${currentGame.id}_${sessionId || 'default'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `game_id=eq.${currentGame.id}`
      }, (payload) => {
        // Only reload if this change affects our tenant
        if (((payload.new as any)?.tenant_id === tenantId) || ((payload.old as any)?.tenant_id === tenantId)) {
          loadGameState(currentGame.id)
        }
      })
      .subscribe()

    let numbersFilter = `game_id=eq.${currentGame.id}`
    if (tenantId) {
      numbersFilter += `&tenant_id=eq.${tenantId}`
    }

    const numbersChannel = supabase
      .channel(`admin_numbers_${tenantId}_${currentGame.id}_${sessionId || 'default'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'called_numbers',
        filter: `game_id=eq.${currentGame.id}`
      }, (payload) => {
        // Only process if this number belongs to our tenant
        if ((payload.new as any)?.tenant_id === tenantId) {
          const newNumber = payload.new.number
          setCurrentNumber(newNumber)
          setCalledNumbers(prev => {
            const exists = prev.some(n => n.number === newNumber)
            if (!exists) {
              const newCalledNumbers = [...prev, { number: newNumber, called_at: payload.new.called_at }]
              const letter = newNumber <= 15 ? 'B' : newNumber <= 30 ? 'I' : newNumber <= 45 ? 'N' : newNumber <= 60 ? 'G' : 'O'
              setRealtimeCallStatus('✅ Real-time call: ' + letter + newNumber + ' (' + newCalledNumbers.length + '/75)')
              
              // Play audio using singleton manager
              const playAudio = async () => {
                try {
                  await tenantAudioManager.playNumber(newNumber, tenantId)
                } catch (error) {
                  console.warn('Audio playback failed:', error)
                }
              }
              playAudio()
              
              setTimeout(() => setRealtimeCallStatus(null), 5000)
              return newCalledNumbers
            }
            return prev
          })
          // Force reload game state to ensure sync
          loadGameState(currentGame.id)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gameChannel)
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(numbersChannel)
    }
  }, [currentGame?.id, tenantId, sessionId])

  // Monitor game status for automatic calling with tenant context
  useEffect(() => {
    if (currentGame?.status === 'active' && currentGame.id && tenantId) {
      // Only start if not already active for this tenant
      if (!tenantAutomaticNumberCaller.isTenantGameActive(tenantId)) {
        console.log('🎯 Admin: Starting tenant automatic caller for:', tenantId, 'game:', currentGame.id)
        
        // Initialize audio for this tenant
        const initAudio = async () => {
          try {
            tenantAudioManager.setTenant(tenantId)
            await tenantAudioManager.playGameStart()
          } catch (error) {
            console.log('Audio init failed:', error)
          }
        }
        initAudio()
        
        const interval = currentGame.call_interval_seconds || callInterval
        tenantAutomaticNumberCaller.startTenantGame(currentGame.id, tenantId, interval)
        setCallInterval(interval)
      }
    } else if (currentGame?.status === 'paused') {
      console.log('⏸️ Admin: Pausing tenant automatic caller')
      tenantAutomaticNumberCaller.pauseTenantGame(tenantId)
    } else if (currentGame?.status === 'finished' || !currentGame) {
      console.log('🛑 Admin: Stopping tenant automatic caller')
      tenantAutomaticNumberCaller.stopTenantGame(tenantId)
    }
  }, [currentGame?.status, currentGame?.id, tenantId])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Admin: Component unmounting, stopping tenant automatic caller')
      if (tenantId) {
        tenantAutomaticNumberCaller.stopTenantGame(tenantId)
      }
    }
  }, [tenantId])

  const loadCurrentGame = async () => {
    setLoading(true)
    try {
      let result
      
      // If specific game ID provided, load that game
      if (gameId) {
        result = await databaseService.getGameState(gameId)
        if (result.success && result.game) {
          setCurrentGame(result.game)
          setPlayers(result.players || [])
          setCalledNumbers(result.called_numbers || [])
          if (result.called_numbers && result.called_numbers.length > 0) {
            const lastNumber = result.called_numbers[result.called_numbers.length - 1]
            setCurrentNumber(lastNumber.number)
          }
        }
      } else {
        // Always load tenant game since all admin pages are tenant-based
        result = await tenantService.getCurrentTenantGame(tenantId)
        if (result.success && result.game) {
          setCurrentGame(result.game)
          await loadGameState(result.game.id)
        }
      }
      
      if (!result?.success || !result?.game) {
        setCurrentGame(null)
        setPlayers([])
        setCalledNumbers([])
        setCurrentNumber(null)
      }
    } catch (error) {
      console.error('Error loading game:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGameState = async (gameId: string) => {
    try {
      // Always filter by tenant ID for complete isolation
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .eq('tenant_id', tenantId)
      
      const { data: numbersData } = await supabase
        .from('called_numbers')
        .select('*')
        .eq('game_id', gameId)
        .eq('tenant_id', tenantId)
        .order('called_at', { ascending: true })
      
      setPlayers(playersData || [])
      setCalledNumbers(numbersData || [])
      
      if (numbersData && numbersData.length > 0) {
        const lastNumber = numbersData[numbersData.length - 1]
        setCurrentNumber(lastNumber.number)
      } else {
        setCurrentNumber(null)
      }
    } catch (error) {
      console.error('Error loading game state:', error)
    }
  }



  const createGame = async () => {
    setLoading(true)
    try {
      // Stop any existing tenant automatic caller
      if (tenantId) {
        tenantAutomaticNumberCaller.stopTenantGame(tenantId)
        console.log('🎮 Creating game: Stopped any existing tenant caller')
      }
      
      // End current game if exists
      if (currentGame?.id) {
        await supabase
          .from('games')
          .update({ status: 'finished', finished_at: new Date().toISOString() })
          .eq('id', currentGame.id)
          .eq('tenant_id', tenantId)
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Create tenant game session with device tracking
      const deviceId = navigator.userAgent + '_' + Date.now()
      const { data, error } = await supabase.rpc('create_tenant_game_isolated', {
        p_tenant_id: tenantId,
        p_admin_email: (user as any)?.email || 'admin',
        p_device_id: deviceId
      })
      
      const result = {
        success: !error,
        game: error ? null : { 
          id: data.game_id, 
          status: 'waiting', 
          entry_fee: 20, 
          platform_fee_percent: 0,
          admin_id: (user as any)?.email || 'admin',
          created_at: new Date().toISOString()
        } as GameState,
        error: error?.message
      }
      
      if (data?.session_id) {
        setSessionId(data.session_id)
      }
      
      if (result.success && result.game) {
        setCurrentGame(result.game)
        setPlayers([])
        setCalledNumbers([])
        setCurrentNumber(null)
        console.log('🎮 Fresh game created:', result.game.id)
        
        // Update URL to reflect new game with session
        const newUrl = `/admin?tenant=${tenantId}&game=${result.game.id}&session=${data?.session_id || 'new'}`
        window.history.pushState({}, '', newUrl)
      } else {
        alert('Failed to create game: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating game:', error)
      alert('Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  const startGame = async () => {
    if (!currentGame) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('games')
        .update({ status: 'active' })
        .eq('id', currentGame.id)
      
      if (error) {
        alert('Failed to start game: ' + error.message)
      } else {
        setCurrentGame(prev => prev ? { ...prev, status: 'active' } : null)
      }
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Failed to start game')
    } finally {
      setLoading(false)
    }
  }

  const pauseGame = async () => {
    if (!currentGame) return
    setLoading(true)
    try {
      // Pause the tenant automatic caller first
      if (tenantId) {
        tenantAutomaticNumberCaller.pauseTenantGame(tenantId)
        console.log('⏸️ Paused tenant automatic caller')
      }
      
      const { data, error } = await supabase
        .from('games')
        .update({ status: 'paused' })
        .eq('id', currentGame.id)
      
      if (error) {
        alert('Failed to pause game: ' + error.message)
      } else {
        setCurrentGame(prev => prev ? { ...prev, status: 'paused' } : null)
      }
    } catch (error) {
      console.error('Error pausing game:', error)
      alert('Failed to pause game')
    } finally {
      setLoading(false)
    }
  }





  const handleVerifyWinner = async () => {
    if (!winnerCardNumber || !currentGame) return
    
    setLoading(true)
    setNotification(null)
    
    try {
      // Use the verify-winner API endpoint
      const response = await fetch('/api/verify-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: currentGame.id, 
          cardNumber: parseInt(winnerCardNumber) 
        })
      })
      
      const result = await response.json()
      
      if (result.success && result.isWinner && result.winner) {
        // Stop tenant automatic caller immediately when winner is found
        if (tenantId) {
          tenantAutomaticNumberCaller.stopTenantGame(tenantId)
          console.log('🏆 Winner found: Stopped tenant automatic caller')
        }
        
        setWinner(result.winner)
        setShowWinnerModal(true)
        setWinnerCardNumber('')
        setNotification({ type: 'success', message: `🏆 Winner verified! Card #${winnerCardNumber}` })
      } else {
        // Show error notification for invalid winner
        const errorMsg = result.error || result.message || `Card #${winnerCardNumber} is not a valid winner`
        setNotification({ type: 'error', message: errorMsg })
        setWinnerCardNumber('')
      }
    } catch (error) {
      console.error('Error verifying winner:', error)
      setNotification({ type: 'error', message: 'Failed to verify winner - please try again' })
    } finally {
      setLoading(false)
    }
  }
  


  const assignCards = async () => {
    if (!playerName.trim() || (selectedCards.length === 0 && !selectedCard) || !currentGame) return
    
    setLoading(true)
    try {
      const cardsToAssign = multiSelectMode ? selectedCards : (selectedCard ? [selectedCard] : [])
      
      // OPTIMIZED: Bulk insert all players at once
      const players = cardsToAssign.map(cardNum => ({
        player_name: playerName.trim(),
        card_number: cardNum
      }))
      
      const { data, error } = await supabase.rpc('bulk_add_players_tenant', {
        p_game_id: currentGame.id,
        p_tenant_id: tenantId,
        p_players: players
      })
      
      if (error || !data?.success) {
        alert('Failed to assign cards: ' + (error?.message || data?.error || 'Unknown error'))
        return
      }
      
      setPlayerName('')
      setSelectedCard(null)
      setSelectedCards([])
      setMultiSelectMode(false)
      setShowCardSelection(false)
      await loadGameState(currentGame.id)
    } catch (error) {
      console.error('Error assigning cards:', error)
      alert('Failed to assign cards')
    } finally {
      setLoading(false)
    }
  }
  
  const updatePlayerCard = async (playerId: string, oldCard: number, newCard: number) => {
    if (!currentGame) return
    
    try {
      const { data, error } = await supabase
        .from('players')
        .update({ card_number: newCard })
        .eq('id', playerId)
        .eq('game_id', currentGame.id)
      
      if (!error) {
        await loadGameState(currentGame.id)
        setEditingPlayer(null)
      } else {
        alert('Failed to update card: ' + error.message)
      }
    } catch (error) {
      console.error('Error updating card:', error)
      alert('Failed to update card')
    }
  }

  useEffect(() => {
    loadCurrentGame()
    
    // Initialize audio manager for this tenant
    const initAudio = async () => {
      try {
        tenantAudioManager.setTenant(tenantId)
        await tenantAudioManager.preloadAudio()
      } catch (error) {
        console.warn('Audio initialization failed:', error)
      }
    }
    initAudio()
    
    return () => {
      // Cleanup handled by singleton
    }
  }, [tenantId, gameId])
  
  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const entryFee = currentGame?.entry_fee || 20
  const platformFeePercent = currentGame?.platform_fee_percent || 20
  const totalPot = players.length * entryFee
  const platformFee = totalPot * (platformFeePercent / 100)
  const winnerPrize = totalPot - platformFee
  const tenantRevenue = platformFee  // Tenant gets the platform fee
  
  const updateGameSettings = async () => {
    if (!currentGame) return
    
    setLoading(true)
    try {
      const entryFeeValue = parseInt(newEntryFee) || currentGame.entry_fee
      const platformFeeValue = parseInt(newPlatformFee) || currentGame.platform_fee_percent
      
      // Validate platform fee
      if (platformFeeValue < 0 || platformFeeValue > 50) {
        alert('Platform fee must be between 0% and 50%')
        setLoading(false)
        return
      }
      
      // Update game settings
      const { error: gameError } = await supabase
        .from('games')
        .update({
          entry_fee: entryFeeValue,
          platform_fee_percent: platformFeeValue
        })
        .eq('id', currentGame.id)
        .eq('tenant_id', tenantId)
      
      if (gameError) {
        alert('Failed to update game: ' + gameError.message)
        setLoading(false)
        return
      }
      
      // Update tenant default platform fee
      const { error: tenantError } = await supabase.rpc('update_tenant_platform_fee', {
        p_tenant_id: tenantId,
        p_platform_fee_percent: platformFeeValue
      })
      
      if (tenantError) {
        console.warn('Failed to update tenant default fee:', tenantError.message)
      }
      
      // Update local state
      setCurrentGame(prev => prev ? {
        ...prev,
        entry_fee: entryFeeValue,
        platform_fee_percent: platformFeeValue
      } : null)
      
      // Close modal and reset form
      setShowPlatformFeeModal(false)
      setNewEntryFee('')
      setNewPlatformFee('')
      
      alert(`Settings updated! Entry fee: ${entryFeeValue} ETB, Platform fee: ${platformFeeValue}%`)
      
    } catch (error) {
      console.error('Error updating game settings:', error)
      alert('Failed to update settings: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Enjoy Bingo" className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              Enjoy Bingo
            </h1>
            <p className="text-white/70 mt-1">
              🔴 Admin Control Panel - Welcome, {tenantName || user?.username}
              {(user as any)?.email && <span className="ml-2 text-yellow-400">({(user as any).email})</span>}
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-3">
          <Button 
            onClick={() => window.open('https://t.me/enjoybingogroup', '_blank')}
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10"
          >
            📱 Support
          </Button>
          <Button 
            onClick={async () => {
              // Log dashboard access activity
              await supabase.rpc('log_user_activity', {
                p_tenant_id: tenantId,
                p_user_email: (user as any)?.email || 'unknown',
                p_activity_type: 'dashboard_access',
                p_page_url: '/tenant',
                p_device_info: navigator.userAgent
              })
              const url = `/tenant?tenant=${tenantId}&from=admin`
              window.location.href = url
            }} 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10"
          >
            📊 Dashboard
          </Button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Sidebar - Game Status */}
        <div className="lg:col-span-3">
          {currentGame && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">🎯 Game Status</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Game ID</div>
                    <div className="text-white font-bold text-xs">{currentGame.id.slice(0, 8)}...</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Status</div>
                    <div className={`font-bold text-xs ${
                      currentGame.status === 'active' ? 'text-green-400' :
                      currentGame.status === 'waiting' ? 'text-yellow-400' :
                      currentGame.status === 'paused' ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                      {currentGame.status?.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Players</div>
                    <div className="text-white font-bold text-xs">{players.length}</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Numbers Called</div>
                    <div className="text-white font-bold text-xs">
                      Tenant: {tenantId?.slice(0, 8)}... | Calls: {calledNumbers.length}/75
                    </div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Total Pot</div>
                    <div className="text-blue-400 font-bold text-xs">{totalPot} ETB</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Platform Fee</div>
                    <div className="text-red-400 font-bold text-xs">{platformFeePercent}% ({platformFee} ETB)</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Winner Prize</div>
                    <div className="text-yellow-400 font-bold text-xs">{winnerPrize} ETB</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-0.5">Tenant Revenue</div>
                    <div className="text-green-400 font-bold text-xs">{tenantRevenue} ETB</div>
                  </div>
                  {/* Real-time Status Display */}
                  <div className="col-span-2 text-center mt-2">
                    <div className="text-white/70 text-xs mb-1">
                      {calledNumbers.length > 0 ? `🎯 Called: ${calledNumbers.length}/75` : '⏳ Ready to start...'}
                    </div>
                    {currentGame.status === 'active' && (
                      <div className="text-green-400 text-xs font-bold animate-pulse">
                        🔴 LIVE • Auto-calling every 6s
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Current Number Display */}
                  {currentNumber && (
                    <div className="col-span-2 text-center mt-3 p-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border border-green-400/30">
                      <div className="text-green-300 text-xs mb-1 font-semibold">🎯 CURRENT NUMBER</div>
                      <div className="text-green-400 font-black text-6xl animate-bounce">
                        {currentNumber <= 15 ? 'B' : 
                         currentNumber <= 30 ? 'I' : 
                         currentNumber <= 45 ? 'N' : 
                         currentNumber <= 60 ? 'G' : 'O'}{currentNumber}
                      </div>
                      <div className="text-green-300 text-xs mt-1">
                        Called {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  )}

                  {/* Real-time Activity Feed */}
                  <div className="col-span-2 text-center mt-2">
                    {realtimeCallStatus ? (
                      <div className="text-green-400 text-xs font-bold bg-green-500/10 px-2 py-1 rounded border border-green-500/30">
                        {realtimeCallStatus}
                      </div>
                    ) : currentGame.status === 'active' ? (
                      <div className="text-yellow-400 text-xs animate-pulse">🔄 Auto-calling active...</div>
                    ) : (
                      <div className="text-white/50 text-xs">⏸️ Game paused</div>
                    )}
                  </div>
                  {currentGame.status === 'active' && tenantId && (
                    <div className="col-span-2 mt-2">
                      <TenantAutoCallerStatus tenantId={tenantId} gameId={currentGame.id} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Center - Number Board */}
        <div className="lg:col-span-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center text-2xl">📋 BINGO NUMBER BOARD</CardTitle>
            </CardHeader>
            <CardContent>
              <TenantNumberBoard 
                tenantId={tenantId}
                gameId={currentGame?.id}
                sessionId={sessionId || undefined}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Sidebar - Game Controls */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">🎮 Game Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              <div className="space-y-3">
                {!currentGame ? (
                  <Button 
                    onClick={createGame}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm"
                  >
                    🎲 Create New Game
                  </Button>
                ) : (
                  <>
                    {currentGame.status === 'waiting' && (
                      <Button
                        onClick={() => setShowCardSelection(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 text-sm"
                      >
                        🏏 Assign Player Cards
                      </Button>
                    )}
                    
                    {currentGame.status === 'waiting' ? (
                      <Button
                        onClick={startGame}
                        disabled={players.length < 1}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 text-sm"
                      >
                        🚀 Start Game ({players.length} players)
                      </Button>
                    ) : currentGame.status === 'active' ? (
                      <Button
                        onClick={pauseGame}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 text-sm"
                      >
                        ⏸️ Pause Game
                      </Button>
                    ) : (
                      <Button
                        onClick={startGame}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 text-sm"
                      >
                        ▶️ Resume Game
                      </Button>
                    )}
                    

                    
                    <div className="space-y-2">
                      <Label className="text-white text-xs">⏱️ Call Interval (seconds)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={callInterval}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 6
                            setCallInterval(Math.max(0, Math.min(10, val)))
                          }}
                          className="bg-white/20 border-white/30 text-white text-sm h-8"
                        />
                        <Button
                          onClick={async () => {
                            if (currentGame?.id) {
                              await supabase
                                .from('games')
                                .update({ call_interval_seconds: callInterval })
                                .eq('id', currentGame.id)
                              
                              tenantAutomaticNumberCaller.updateCallInterval(tenantId, callInterval)
                              setCurrentGame(prev => prev ? {...prev, call_interval_seconds: callInterval} : null)
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                        >
                          Apply
                        </Button>
                      </div>
                      <div className="text-white/60 text-xs">
                        0 = instant, 10 = slowest
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => setShowPlatformFeeModal(true)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 text-sm"
                    >
                      ⚙️ Game Settings
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        if (confirm('End this game? This will reset everything and create a new session.')) {
                          setLoading(true)
                          try {
                            // Stop tenant automatic caller first
                            if (tenantId) {
                              tenantAutomaticNumberCaller.stopTenantGame(tenantId)
                              console.log('🛑 Admin: Stopped tenant automatic caller')
                            }
                            
                            // Wait a moment for cleanup
                            await new Promise(resolve => setTimeout(resolve, 500))
                            
                            // End games only for this specific tenant user
                            const { data, error } = await supabase.rpc('end_tenant_user_games_isolated', {
                              p_tenant_id: tenantId,
                              p_user_email: (user as any)?.email || 'unknown'
                            })
                            
                            if (!error && data?.success) {
                              // Reset all local state completely
                              setCurrentGame(null)
                              setPlayers([])
                              setCalledNumbers([])
                              setCurrentNumber(null)
                              setSessionId(null)
                              setRealtimeCallStatus(null)
                              
                              // Force refresh the TenantNumberBoard by clearing its state
                              window.dispatchEvent(new CustomEvent('resetBingoBoard', { detail: { tenantId } }))
                              
                              console.log('🏁 Admin: User games ended successfully')
                              alert(`Ended ${data.games_ended} of your games, cleared ${data.players_cleared} players`)
                            } else {
                              alert('Failed to reset game: ' + (error?.message || data?.error || 'Unknown error'))
                            }
                          } catch (error) {
                            console.error('Error resetting game:', error)
                            alert('Failed to reset game')
                          } finally {
                            setLoading(false)
                          }
                        }
                      }}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 text-sm"
                    >
                      🏁 End & Reset Game
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">🏆 Winner Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {notification && (
                <div className={`p-2 rounded text-sm font-medium ${
                  notification.type === 'success' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {notification.message}
                </div>
              )}
              <div>
                <Label htmlFor="cardNumber" className="text-white mb-2 block">Card Number (1-100)</Label>
                <Input
                  id="cardNumber"
                  type="number"
                  min="1"
                  max="100"
                  value={winnerCardNumber}
                  onChange={(e) => {
                    setWinnerCardNumber(e.target.value)
                    setNotification(null) // Clear notification when typing
                  }}
                  placeholder="Enter winning card number"
                  className="bg-white/20 border-white/30 text-white placeholder-white/50"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyWinner()
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleVerifyWinner}
                disabled={!winnerCardNumber || !currentGame || loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 text-sm"
              >
                {loading ? '⏳ Verifying...' : '✓ Verify Winner'}
              </Button>
            </CardContent>
          </Card>
          

        </div>
      </div>

      {/* Players List */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">👥 Active Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {players.map((player) => (
                <div key={player.id} className="bg-white/10 rounded-lg p-3 border border-white/20 text-center">
                  <div className="font-medium text-white text-sm truncate">{player.player_name}</div>
                  <div className="text-white/80 text-xs flex items-center justify-center gap-1">
                    #{player.card_number}
                    <button
                      onClick={() => setEditingPlayer(editingPlayer === player.id ? null : player.id)}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                      title="Edit card"
                    >
                      ✏️
                    </button>
                  </div>
                  {editingPlayer === player.id && (
                    <div className="mt-1">
                      <select
                        onChange={(e) => {
                          const newCard = parseInt(e.target.value)
                          if (newCard && newCard !== player.card_number) {
                            updatePlayerCard(player.id, player.card_number, newCard)
                          }
                        }}
                        className="bg-slate-700 text-white text-xs rounded px-1 py-0.5 w-full"
                        defaultValue={player.card_number}
                      >
                        {Array.from({length: 100}, (_, i) => i + 1)
                          .filter(num => num === player.card_number || !players.some(p => p.card_number === num))
                          .map(num => (
                            <option key={num} value={num}>#{num}</option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                  <div className="text-green-400 text-xs font-medium">{entryFee} ETB</div>
                  {player.is_winner && (
                    <div className="text-yellow-400 text-xs font-bold">🏆</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-white/60">No players in current game</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Selection Modal */}
      {showCardSelection && currentGame && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-[80vw] h-[90vh] bg-white/20 backdrop-blur-lg border-white/30">
            <CardHeader>
              <CardTitle className="text-white text-center">🏏 Assign Bingo Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Player Name</Label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-white/10 border-white/30 text-white placeholder-white/50"
                  placeholder="Enter player name"
                />
              </div>
              
              <div>
                <Label className="text-white mb-2 block">Select Card Number (1-100)</Label>
                <div className="flex gap-6">
                  {(selectedCard || (multiSelectMode && selectedCards.length > 0)) && (
                    <div className="flex-shrink-0">
                      {!multiSelectMode && selectedCard ? (
                        <>
                          <div className="text-white text-sm mb-2">Card #{selectedCard} Preview</div>
                          <CardPreview cardNumber={selectedCard} />
                        </>
                      ) : (
                        <>
                          <div className="text-white text-sm mb-2">Selected Cards Preview</div>
                          <div className="relative">
                            <div 
                              ref={scrollRef}
                              className="flex gap-2 max-w-xs overflow-x-hidden scroll-smooth"
                              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                            >
                              {selectedCards.map(cardNum => (
                                <div key={cardNum} className="flex-shrink-0">
                                  <CardPreview cardNumber={cardNum} />
                                </div>
                              ))}
                            </div>
                            {selectedCards.length > 1 && (
                              <>
                                <button
                                  onClick={() => scrollPreview('left')}
                                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full z-10"
                                >
                                  ‹
                                </button>
                                <button
                                  onClick={() => scrollPreview('right')}
                                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full z-10"
                                >
                                  ›
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="w-full max-w-2xl mx-auto">
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            setMultiSelectMode(false)
                            setSelectedCards([])
                          }}
                          className={`px-3 py-1 rounded text-xs ${
                            !multiSelectMode ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/70'
                          }`}
                        >
                          Single Card
                        </button>
                        <button
                          onClick={() => {
                            setMultiSelectMode(true)
                            setSelectedCard(null)
                          }}
                          className={`px-3 py-1 rounded text-xs ${
                            multiSelectMode ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/70'
                          }`}
                        >
                          Multiple Cards
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-10 gap-0.5 p-4 border border-white/30 rounded bg-white/5 h-96 overflow-y-auto">
                        {Array.from({ length: 100 }, (_, i) => i + 1).map(cardNum => {
                          const isTaken = players.some(p => p.card_number === cardNum)
                          const isSelected = multiSelectMode 
                            ? selectedCards.includes(cardNum)
                            : selectedCard === cardNum
                          
                          const handleCardClick = () => {
                            if (isTaken) return
                            
                            if (multiSelectMode) {
                              setSelectedCards(prev => 
                                prev.includes(cardNum)
                                  ? prev.filter(c => c !== cardNum)
                                  : [...prev, cardNum]
                              )
                            } else {
                              setSelectedCard(cardNum)
                            }
                          }
                          
                          return (
                            <button
                              key={cardNum}
                              onClick={handleCardClick}
                              disabled={isTaken}
                              className={`w-8 h-8 text-xs font-bold border rounded transition-all ${
                                isSelected
                                  ? 'bg-blue-500 text-white border-blue-600 scale-110'
                                  : !isTaken
                                  ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/40'
                                  : 'bg-red-500/20 text-red-400 border-red-500/50 cursor-not-allowed'
                              }`}
                              title={isTaken ? 'Card taken' : `Select card ${cardNum}`}
                            >
                              {cardNum}
                            </button>
                          )
                        })}
                      </div>
                      

                    </div>
                    <div className="mt-2 text-xs text-white/60">
                      <span className="text-green-400">●</span> Available 
                      <span className="text-red-400 ml-3">●</span> Taken 
                      <span className="text-blue-400 ml-3">●</span> Selected
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={assignCards}
                  disabled={!playerName.trim() || (multiSelectMode ? selectedCards.length === 0 : !selectedCard) || loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? '⏳ Assigning...' : 
                   multiSelectMode ? `💰 Assign ${selectedCards.length} Cards (${selectedCards.length * entryFee} ETB)` :
                   `💰 Assign Card (${entryFee} ETB)`}
                </Button>
                <Button
                  onClick={() => {
                    setShowCardSelection(false)
                    setPlayerName('')
                    setSelectedCard(null)
                    setSelectedCards([])
                    setMultiSelectMode(false)
                  }}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Fee Settings Modal */}
      {showPlatformFeeModal && currentGame && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white/20 backdrop-blur-lg border-white/30">
            <CardHeader>
              <CardTitle className="text-white text-center">⚙️ Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Entry Fee (ETB)</Label>
                <Input
                  type="number"
                  value={newEntryFee || currentGame.entry_fee}
                  onChange={(e) => setNewEntryFee(e.target.value)}
                  className="bg-white/10 border-white/30 text-white placeholder-white/50"
                  placeholder="Entry fee per player"
                />
              </div>
              
              <div>
                <Label className="text-white mb-2 block">
                  Platform Fee (%) - Your Commission
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={newPlatformFee || currentGame.platform_fee_percent}
                  onChange={(e) => setNewPlatformFee(e.target.value)}
                  className="bg-white/10 border-white/30 text-white placeholder-white/50"
                  placeholder="Platform fee percentage (0-50%)"
                />
                <div className="text-white/60 text-xs mt-1">
                  You get {newPlatformFee || currentGame.platform_fee_percent}% commission, Winner gets the rest
                </div>
              </div>
              
              <div className="bg-white/10 rounded p-3">
                <div className="text-white/70 text-sm mb-2">Preview with {players.length} players:</div>
                <div className="text-white text-sm">
                  {(() => {
                    const previewEntryFee = parseInt(newEntryFee) || currentGame.entry_fee
                    const previewPlatformFee = parseInt(newPlatformFee) || currentGame.platform_fee_percent
                    const previewTotalPot = players.length * previewEntryFee
                    const previewTenantRevenue = Math.round(previewTotalPot * (previewPlatformFee / 100))
                    const previewWinnerPrize = previewTotalPot - previewTenantRevenue
                    
                    return (
                      <>
                        <div>💰 Total Pot: {previewTotalPot} ETB</div>
                        <div className="text-green-400">🏢 Your Revenue ({previewPlatformFee}%): {previewTenantRevenue} ETB</div>
                        <div className="text-yellow-400 font-bold">
                          🏆 Winner Prize ({100 - previewPlatformFee}%): {previewWinnerPrize} ETB
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={updateGameSettings}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Updating...' : 'Update Settings'}
                </Button>
                <Button
                  onClick={() => {
                    setShowPlatformFeeModal(false)
                    setNewEntryFee('')
                    setNewPlatformFee('')
                  }}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showWinnerModal && winner && (
        <WinnerModal
          winner={winner}
          totalPlayers={players.length}
          calledNumbers={calledNumbers.map(n => n.number)}
          tenantId={tenantId}
          gameId={currentGame?.id}
          currentGame={currentGame}
          onClose={async () => {
            setShowWinnerModal(false)
            setWinner(null)
            setNotification(null)
            
            // Stop tenant automatic caller first
            if (tenantId) {
              tenantAutomaticNumberCaller.stopTenantGame(tenantId)
              console.log('🏆 Winner modal: Stopped tenant automatic caller')
            }
            
            // End and reset current game
            if (currentGame) {
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // End games only for this specific tenant user
              await supabase.rpc('end_tenant_user_games_isolated', {
                p_tenant_id: tenantId,
                p_user_email: (user as any)?.email || 'unknown'
              })
              
              // Reset all state completely
              setCurrentGame(null)
              setPlayers([])
              setCalledNumbers([])
              setCurrentNumber(null)
              setSessionId(null)
              setRealtimeCallStatus(null)
              
              // Force refresh the TenantNumberBoard
              window.dispatchEvent(new CustomEvent('resetBingoBoard', { detail: { tenantId } }))
              
              console.log('🏆 Winner modal: User games ended successfully')
            }
          }}
        />
      )}
      
      {/* Debug Info */}
      <div className="text-center py-4 text-white/60 text-sm">
        Tenant: {tenantId?.slice(0, 8)}... | Game: {currentGame?.id?.slice(0, 8) || 'none'}... | Session: {sessionId?.slice(0, 8) || urlSessionId?.slice(0, 8) || 'none'}
      </div>

    </div>
  )
}

export default function AdminPage() {
  return <AdminDashboard />
}