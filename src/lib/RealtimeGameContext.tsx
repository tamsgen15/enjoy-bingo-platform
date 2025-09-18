'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { OfflineAmharicTTS } from '@/lib/OfflineAmharicTTS'

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
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null)
  const [voiceTTS] = useState(() => new OfflineAmharicTTS())

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

  // Auto number calling
  useEffect(() => {
    if (state.gameRunning && state.currentGame?.status === 'active' && supabase) {
      const interval = setInterval(async () => {
        if (state.calledNumbers.length < 75) {
          const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
            .filter(num => !state.calledNumbers.includes(num))
          
          if (availableNumbers.length > 0) {
            const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)]
            
            try {
              await supabase
                .from('called_numbers')
                .insert({
                  game_id: state.currentGame.id,
                  number: nextNumber
                })
              
              setTimeout(() => {
                const letter = nextNumber <= 15 ? 'B' : nextNumber <= 30 ? 'I' : nextNumber <= 45 ? 'N' : nextNumber <= 60 ? 'G' : 'O'
                voiceTTS.speak(`${letter} ${nextNumber}`)
              }, 1000)
            } catch (error) {
              console.error('Failed to call number:', error)
            }
          }
        }
      }, 5000)
      
      setAutoCallInterval(interval)
      return () => clearInterval(interval)
    } else {
      if (autoCallInterval) {
        clearInterval(autoCallInterval)
        setAutoCallInterval(null)
      }
    }
  }, [state.gameRunning, state.currentGame?.status, state.calledNumbers.length])

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

      // Immediately start number calling
      setState(prev => ({ ...prev, gameRunning: true }))
      
      setTimeout(() => {
        voiceTTS.speak("Game Started")
      }, 500)
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
      
      // Immediately stop number calling
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
          selected_card_number: cardNumber
        })
        .select()
        .single()

      if (error) throw error
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const verifyWinner = async (cardNumber: number) => {
    if (!state.currentGame || !supabase) return null
    
    try {
      setState(prev => ({ ...prev, loading: true }))
      
      // Get player from database
      const { data: player, error: playerFetchError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', state.currentGame.id)
        .eq('selected_card_number', cardNumber)
        .single()

      if (playerFetchError || !player) {
        throw new Error('No player found with that card number')
      }

      // Get bingo card from database
      const { data: bingoCard, error: cardError } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('card_number', cardNumber)
        .single()

      if (cardError || !bingoCard) {
        throw new Error('Bingo card not found')
      }

      // Check if player has valid bingo
      const calledSet = new Set(state.calledNumbers)
      
      // Create 5x5 grid with FREE space
      const grid = [
        bingoCard.b_column,
        bingoCard.i_column,
        [...bingoCard.n_column.slice(0, 2), 'FREE', ...bingoCard.n_column.slice(2)],
        bingoCard.g_column,
        bingoCard.o_column
      ]
      
      // Check horizontal lines
      for (let row = 0; row < 5; row++) {
        const rowComplete = grid.every(col => col[row] === 'FREE' || calledSet.has(col[row]))
        if (rowComplete) {
          // Valid horizontal bingo found
          break
        }
      }
      
      // Check vertical lines
      let hasVertical = false
      for (let col = 0; col < 5; col++) {
        const colComplete = grid[col].every((num: any) => num === 'FREE' || calledSet.has(num))
        if (colComplete) {
          hasVertical = true
          break
        }
      }
      
      // Check diagonal lines
      const diagonal1 = [grid[0][0], grid[1][1], 'FREE', grid[3][3], grid[4][4]]
      const diagonal2 = [grid[0][4], grid[1][3], 'FREE', grid[3][1], grid[4][0]]
      const hasDiagonal1 = diagonal1.every(num => num === 'FREE' || calledSet.has(num))
      const hasDiagonal2 = diagonal2.every(num => num === 'FREE' || calledSet.has(num))
      
      // Check full house
      const allNumbers = grid.flat().filter(num => num !== 'FREE')
      const hasFullHouse = allNumbers.every(num => calledSet.has(num))
      
      // Check if any winning pattern exists
      let hasHorizontal = false
      for (let row = 0; row < 5; row++) {
        const rowComplete = grid.every(col => col[row] === 'FREE' || calledSet.has(col[row]))
        if (rowComplete) {
          hasHorizontal = true
          break
        }
      }
      
      if (!hasHorizontal && !hasVertical && !hasDiagonal1 && !hasDiagonal2 && !hasFullHouse) {
        const matchedNumbers = allNumbers.filter(num => calledSet.has(num))
        throw new Error(`Invalid bingo! Player has ${matchedNumbers.length}/24 numbers called. Need horizontal line, vertical line, diagonal, or full house.`)
      }

      const entryFee = 10
      const totalBets = state.players.length * entryFee
      const platformFee = totalBets * 0.20
      const prize = totalBets - platformFee

      // Update player as winner
      const { error: playerError } = await supabase
        .from('players')
        .update({ is_winner: true })
        .eq('id', player.id)

      if (playerError) throw playerError

      // Update game status to finished
      const { error: gameError } = await supabase
        .from('games')
        .update({ 
          status: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', state.currentGame.id)

      if (gameError) throw gameError

      setState(prev => ({ 
        ...prev, 
        gameRunning: false,
        currentGame: { ...prev.currentGame, status: 'finished' }
      }))

      return {
        isWinner: true,
        name: player.player_name,
        cardNumber: player.selected_card_number,
        entryFee,
        totalBets,
        prize,
        platformFee
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
      throw error // Re-throw to show in UI
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
    if (!supabase) return
    
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(num => !state.calledNumbers.includes(num))
    
    if (availableNumbers.length > 0) {
      const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)]
      
      try {
        await supabase
          .from('called_numbers')
          .insert({
            game_id: gameId,
            number: nextNumber
          })
      } catch (error) {
        console.error('Failed to call number:', error)
      }
    }
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