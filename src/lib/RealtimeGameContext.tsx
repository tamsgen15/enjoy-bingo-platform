'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { automaticNumberCaller } from '@/lib/AutomaticNumberCaller'
import { WinningVerificationService } from '@/lib/winningVerificationService'

interface GameState {
  currentGame: any
  players: any[]
  calledNumbers: number[]
  currentNumber: number | null
  gameRunning: boolean
  loading: boolean
  error: string | null
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
}

const initialState: GameState = {
  currentGame: null,
  players: [],
  calledNumbers: [],
  currentNumber: null,
  gameRunning: false,
  loading: false,
  error: null
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function RealtimeGameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState)


  // Real-time subscriptions
  useEffect(() => {
    if (!supabase) return

    const gamesSubscription = supabase
      .channel('games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload: any) => {
        if (payload.eventType === 'UPDATE' && payload.new.id === state.currentGame?.id) {
          setState(prev => ({
            ...prev,
            currentGame: payload.new,
            gameRunning: payload.new.status === 'active'
          }))
        }
      })
      .subscribe()

    const playersSubscription = supabase
      .channel('players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setState(prev => ({
            ...prev,
            players: [...prev.players, payload.new]
          }))
        } else if (payload.eventType === 'UPDATE') {
          setState(prev => ({
            ...prev,
            players: prev.players.map(p => p.id === payload.new.id ? payload.new : p)
          }))
        }
      })
      .subscribe()

    const calledNumbersSubscription = supabase
      .channel('called_numbers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'called_numbers' }, (payload: any) => {
        if (payload.new.game_id === state.currentGame?.id) {
          setState(prev => ({
            ...prev,
            calledNumbers: [...prev.calledNumbers, payload.new.number],
            currentNumber: payload.new.number
          }))
        }
      })
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(gamesSubscription)
        supabase.removeChannel(playersSubscription)
        supabase.removeChannel(calledNumbersSubscription)
      }
    }
  }, [state.currentGame?.id])

  // Monitor game status for automatic calling
  useEffect(() => {
    if (state.currentGame?.status === 'active' && state.currentGame.id) {
      if (!automaticNumberCaller.isGameActive() || automaticNumberCaller.getCurrentGameId() !== state.currentGame.id) {
        console.log('🎯 RealtimeContext: Starting automatic caller for game:', state.currentGame.id)
        automaticNumberCaller.startGame(state.currentGame.id)
      }
    } else if (state.currentGame?.status === 'paused') {
      automaticNumberCaller.pauseGame()
    } else if (state.currentGame?.status === 'finished' || !state.currentGame) {
      automaticNumberCaller.stopGame()
    }
  }, [state.currentGame?.status, state.currentGame?.id])

  const createGame = async (ruleId?: string) => {
    if (!supabase) {
      setState(prev => ({ ...prev, error: 'Supabase client not available' }))
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true }))
      
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

      setState(prev => ({
        ...prev,
        currentGame: game,
        players: [],
        calledNumbers: [],
        currentNumber: null,
        gameRunning: false
      }))
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const startGame = async () => {
    if (!state.currentGame || !supabase) return
    
    try {
      setState(prev => ({ ...prev, loading: true }))
      
      const { error } = await supabase
        .from('games')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', state.currentGame.id)

      if (error) throw error

      setState(prev => ({ ...prev, gameRunning: true }))
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const pauseGame = async () => {
    if (!state.currentGame || !supabase) return
    
    try {
      setState(prev => ({ ...prev, loading: true }))
      
      setState(prev => ({ ...prev, gameRunning: false }))
      
      const { error } = await supabase
        .from('games')
        .update({ status: 'paused' })
        .eq('id', state.currentGame.id)

      if (error) throw error

      setState(prev => ({ 
        ...prev,
        currentGame: { ...prev.currentGame, status: 'paused' }
      }))
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const assignCard = async (playerName: string, cardNumber: number) => {
    if (!state.currentGame || !supabase) return
    
    try {
      setState(prev => ({ ...prev, loading: true }))
      
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          game_id: state.currentGame.id,
          player_name: playerName,
          card_number: cardNumber
        })
        .select()
        .single()

      if (error) throw error
      
      // Initialize player's marked positions with free space
      await supabase
        .from('player_marked_numbers')
        .insert({
          game_id: state.currentGame.id,
          player_id: player.id,
          card_number: cardNumber,
          marked_positions: [12] // Center position is always marked
        })
        .select()
        .single()
        
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const verifyWinner = async (cardNumber: number) => {
    if (!state.currentGame || !supabase) return null
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      // First check if player exists in current game
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', state.currentGame.id)
        .eq('card_number', cardNumber)
        .single()

      if (playerError || !player) {
        throw new Error(`Card #${cardNumber} is not registered in this game`)
      }

      // Use the new winning verification service
      const result = await WinningVerificationService.verifyWinner(state.currentGame.id, cardNumber)
      
      if (result.isWinner && result.pattern && result.player) {
        // Declare winner using the service
        const success = await WinningVerificationService.declareWinner(
          state.currentGame.id,
          result.player.id,
          result.pattern.name
        )
        
        if (success) {
          setState(prev => ({ 
            ...prev, 
            gameRunning: false,
            currentGame: { ...prev.currentGame, status: 'finished' }
          }))

          // Stop automatic caller when game finishes
          automaticNumberCaller.stopGame()
          console.log('🏆 RealtimeContext: Winner found, caller stopped')

          return {
            isWinner: true,
            name: result.player.player_name,
            cardNumber: result.player.card_number,
            prize: result.prize,
            totalPot: result.totalPot,
            platformFee: result.platformFee,
            pattern: result.pattern,
            markedPositions: result.markedPositions,
            player: result.player
          }
        } else {
          throw new Error('Failed to declare winner - game may already have a winner')
        }
      } else {
        // Player exists but doesn't have winning pattern
        const patterns = await WinningVerificationService.getActiveWinningPatterns()
        const markedPositions = result.markedPositions || []
        
        const patternStatus = patterns.map(pattern => {
          const requiredPositions = pattern.pattern_positions
          const markedInPattern = requiredPositions.filter(pos => markedPositions.includes(pos))
          const completion = (markedInPattern.length / requiredPositions.length) * 100
          
          return {
            name: pattern.name,
            completion: Math.round(completion),
            markedCount: markedInPattern.length,
            totalCount: requiredPositions.length
          }
        })
        
        const bestPattern = patternStatus.reduce((best, current) => 
          current.completion > best.completion ? current : best, 
          { completion: 0, name: 'None' }
        )
        
        throw new Error(
          `Card #${cardNumber} (${player.player_name}) is not a winner. ` +
          `Best pattern: ${bestPattern.name} (${bestPattern.completion}% complete)`
        )
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
      return { isWinner: false, error: (error as Error).message }
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const resetGame = () => {
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
          card_number: cardNumber
        })
        .select()
        .single()

      if (error) throw error
      
      // Initialize player's marked positions with free space
      await supabase
        .from('player_marked_numbers')
        .insert({
          game_id: gameId,
          player_id: player.id,
          card_number: cardNumber,
          marked_positions: [12] // Center position is always marked
        })
        
      return { player, card: { cardNumber } }
    } catch (error) {
      throw error
    }
  }

  const callNumber = async (gameId: string) => {
    // This function is deprecated - automatic calling is now handled by AutomaticNumberCaller
    console.warn('callNumber is deprecated - use AutomaticNumberCaller instead')
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
    callNumber
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useRealtimeGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useRealtimeGame must be used within a RealtimeGameProvider')
  }
  return context
}