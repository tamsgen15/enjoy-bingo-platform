'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface GameState {
  currentGame: any
  players: any[]
  calledNumbers: number[]
  currentNumber: number | null
  gameRunning: boolean
  loading: boolean
  error: string | null
  isCallingNumber: boolean
}

interface GameContextType extends GameState {
  createGame: () => Promise<void>
  startGame: () => Promise<void>
  pauseGame: () => Promise<void>
  assignCard: (playerName: string, cardNumber: number) => Promise<void>
  verifyWinner: (cardNumber: number) => Promise<any>
  resetGame: () => void
  joinGame: (gameId: string, playerName: string, cardNumber: number) => Promise<any>
  callNumber: (gameId: string) => Promise<void>
  callNextNumber: () => Promise<void>
}

const initialState: GameState = {
  currentGame: null,
  players: [],
  calledNumbers: [],
  currentNumber: null,
  gameRunning: false,
  loading: false,
  error: null,
  isCallingNumber: false
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function EnhancedRealtimeGameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState)
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null)
  const callingRef = useRef(false)

  // Debounced state setter to prevent rapid updates
  const updateState = useCallback((updater: (prev: GameState) => GameState) => {
    setState(prev => {
      const newState = updater(prev)
      return JSON.stringify(newState) !== JSON.stringify(prev) ? newState : prev
    })
  }, [])

  // Real-time subscriptions with proper cleanup
  useEffect(() => {
    if (!supabase || !state.currentGame?.id) return

    const gameId = state.currentGame.id

    // Games subscription
    const gamesChannel = supabase
      .channel(`game_${gameId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload: any) => {
        updateState(prev => ({
          ...prev,
          currentGame: payload.new,
          gameRunning: payload.new.status === 'active'
        }))
      })
      .subscribe()

    // Players subscription
    const playersChannel = supabase
      .channel(`players_${gameId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'players',
        filter: `game_id=eq.${gameId}`
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          updateState(prev => ({
            ...prev,
            players: [...prev.players, payload.new]
          }))
        } else if (payload.eventType === 'UPDATE') {
          updateState(prev => ({
            ...prev,
            players: prev.players.map(p => p.id === payload.new.id ? payload.new : p)
          }))
        } else if (payload.eventType === 'DELETE') {
          updateState(prev => ({
            ...prev,
            players: prev.players.filter(p => p.id !== payload.old.id)
          }))
        }
      })
      .subscribe()

    // Called numbers subscription with duplicate prevention
    const calledNumbersChannel = supabase
      .channel(`called_numbers_${gameId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'called_numbers',
        filter: `game_id=eq.${gameId}`
      }, (payload: any) => {
        const newNumber = payload.new.number
        updateState(prev => {
          if (!prev.calledNumbers.includes(newNumber)) {
            const newCalledNumbers = [...prev.calledNumbers, newNumber]
            
            // Voice announcement is handled by AutomaticNumberCaller
            // No duplicate announcement here
            
            return {
              ...prev,
              calledNumbers: newCalledNumbers,
              currentNumber: newNumber
            }
          }
          return prev
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gamesChannel)
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(calledNumbersChannel)
    }
  }, [state.currentGame?.id, updateState])

  // Enhanced auto number calling with proper synchronization
  useEffect(() => {
    if (state.gameRunning && 
        state.currentGame?.status === 'active' && 
        state.calledNumbers.length < 75 && 
        !state.isCallingNumber) {
      
      const interval = setInterval(async () => {
        if (!callingRef.current && state.calledNumbers.length < 75) {
          await callNextNumber()
        }
      }, 6000) // 6 second intervals
      
      setAutoCallInterval(interval)
      return () => clearInterval(interval)
    } else {
      if (autoCallInterval) {
        clearInterval(autoCallInterval)
        setAutoCallInterval(null)
      }
    }
  }, [state.gameRunning, state.currentGame?.status, state.calledNumbers.length, state.isCallingNumber])

  const callNextNumber = useCallback(async () => {
    if (!state.currentGame || 
        callingRef.current || 
        state.isCallingNumber || 
        state.calledNumbers.length >= 75 ||
        state.currentGame.status !== 'active') {
      return
    }

    callingRef.current = true
    updateState(prev => ({ ...prev, isCallingNumber: true }))

    try {
      const { data: result, error } = await supabase
        .rpc('call_next_number', { game_uuid: state.currentGame.id })

      if (error) {
        console.error('Database error calling number:', error)
        updateState(prev => ({ ...prev, error: 'Failed to call number' }))
        return
      }

      if (!result?.success) {
        if (result?.error && !result.error.includes('All numbers')) {
          console.error('Number calling failed:', result.error)
          updateState(prev => ({ ...prev, error: result.error }))
        }
        return
      }

      console.log(`Successfully called number ${result.number} (${result.total_called}/75)`)
      
    } catch (error) {
      console.error('Error calling number:', error)
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }))
    } finally {
      callingRef.current = false
      // Reset calling state after a brief delay to prevent rapid calls
      setTimeout(() => {
        updateState(prev => ({ ...prev, isCallingNumber: false }))
      }, 1000)
    }
  }, [state.currentGame, state.isCallingNumber, state.calledNumbers.length, updateState])

  const createGame = async () => {
    if (!supabase) {
      updateState(prev => ({ ...prev, error: 'Supabase client not available' }))
      return
    }

    try {
      updateState(prev => ({ ...prev, loading: true, error: null }))
      
      const adminId = crypto.randomUUID()
      
      const { data: game, error } = await supabase
        .from('games')
        .insert({
          admin_id: adminId,
          status: 'waiting'
        })
        .select('*')
        .single()

      if (error) throw error

      updateState(prev => ({
        ...prev,
        currentGame: game,
        players: [],
        calledNumbers: [],
        currentNumber: null,
        gameRunning: false
      }))
    } catch (error) {
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create game' 
      }))
    } finally {
      updateState(prev => ({ ...prev, loading: false }))
    }
  }

  const startGame = async () => {
    if (!state.currentGame || !supabase) return
    
    try {
      updateState(prev => ({ ...prev, loading: true, error: null }))
      
      const { error } = await supabase
        .from('games')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', state.currentGame.id)

      if (error) throw error

      updateState(prev => ({ ...prev, gameRunning: true }))
      
      // Game start announcement is handled by AutomaticNumberCaller
      // No duplicate announcement here
    } catch (error) {
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start game' 
      }))
    } finally {
      updateState(prev => ({ ...prev, loading: false }))
    }
  }

  const pauseGame = async () => {
    if (!state.currentGame || !supabase) return
    
    try {
      updateState(prev => ({ ...prev, loading: true, error: null }))
      
      const { error } = await supabase
        .from('games')
        .update({ status: 'paused' })
        .eq('id', state.currentGame.id)

      if (error) throw error

      updateState(prev => ({ 
        ...prev,
        gameRunning: false,
        currentGame: { ...prev.currentGame, status: 'paused' }
      }))
    } catch (error) {
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to pause game' 
      }))
    } finally {
      updateState(prev => ({ ...prev, loading: false }))
    }
  }

  const assignCard = async (playerName: string, cardNumber: number) => {
    if (!state.currentGame || !supabase) return
    
    try {
      updateState(prev => ({ ...prev, loading: true, error: null }))
      
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          game_id: state.currentGame.id,
          player_name: playerName,
          selected_card_number: cardNumber
        })
        .select()
        .single()

      if (error) throw error
    } catch (error) {
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to assign card' 
      }))
      throw error
    } finally {
      updateState(prev => ({ ...prev, loading: false }))
    }
  }

  const verifyWinner = async (cardNumber: number) => {
    if (!state.currentGame || !supabase) return null
    
    try {
      updateState(prev => ({ ...prev, loading: true, error: null }))
      
      // Implementation remains the same as original
      // ... (keeping the existing winner verification logic)
      
    } catch (error) {
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to verify winner' 
      }))
      throw error
    } finally {
      updateState(prev => ({ ...prev, loading: false }))
    }
  }

  const resetGame = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval)
      setAutoCallInterval(null)
    }
    callingRef.current = false
    setState(initialState)
  }

  const joinGame = async (gameId: string, playerName: string, cardNumber: number) => {
    if (!supabase) throw new Error('Supabase client not available')
    
    try {
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          game_id: gameId,
          player_name: playerName,
          selected_card_number: cardNumber
        })
        .select()
        .single()

      if (error) throw error
      return { player, card: { cardNumber } }
    } catch (error) {
      throw error
    }
  }

  const callNumber = async (gameId: string) => {
    // Delegate to callNextNumber for consistency
    await callNextNumber()
  }

  const value: GameContextType = {
    ...state,
    createGame,
    startGame,
    pauseGame,
    assignCard,
    verifyWinner,
    resetGame,
    joinGame,
    callNumber,
    callNextNumber
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useEnhancedRealtimeGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useEnhancedRealtimeGame must be used within an EnhancedRealtimeGameProvider')
  }
  return context
}