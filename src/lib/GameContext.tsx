'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/api'

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
  assignCard: (playerName: string, cardNumber: number) => Promise<void>
  verifyWinner: (cardNumber: number) => Promise<void>
  resetGame: () => void
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

type GameAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GAME'; payload: any }
  | { type: 'SET_PLAYERS'; payload: any[] }
  | { type: 'ADD_PLAYER'; payload: any }
  | { type: 'SET_CALLED_NUMBERS'; payload: number[] }
  | { type: 'ADD_CALLED_NUMBER'; payload: number }
  | { type: 'SET_CURRENT_NUMBER'; payload: number | null }
  | { type: 'SET_GAME_RUNNING'; payload: boolean }
  | { type: 'RESET_GAME' }

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_GAME':
      return { ...state, currentGame: action.payload }
    case 'SET_PLAYERS':
      return { ...state, players: action.payload }
    case 'ADD_PLAYER':
      return { ...state, players: [...state.players, action.payload] }
    case 'SET_CALLED_NUMBERS':
      return { ...state, calledNumbers: action.payload }
    case 'ADD_CALLED_NUMBER':
      return { 
        ...state, 
        calledNumbers: [...state.calledNumbers, action.payload],
        currentNumber: action.payload
      }
    case 'SET_CURRENT_NUMBER':
      return { ...state, currentNumber: action.payload }
    case 'SET_GAME_RUNNING':
      return { ...state, gameRunning: action.payload }
    case 'RESET_GAME':
      return { ...initialState }
    default:
      return state
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  const createGame = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const game = await apiClient.createGame()
      dispatch({ type: 'SET_GAME', payload: game })
      dispatch({ type: 'SET_PLAYERS', payload: [] })
      dispatch({ type: 'SET_CALLED_NUMBERS', payload: [] })
      dispatch({ type: 'SET_CURRENT_NUMBER', payload: null })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const startGame = async () => {
    if (!state.currentGame) return
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await apiClient.startGame(state.currentGame.id)
      dispatch({ type: 'SET_GAME_RUNNING', payload: true })
      dispatch({ type: 'SET_GAME', payload: { ...state.currentGame, status: 'active' } })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const assignCard = async (playerName: string, cardNumber: number) => {
    if (!state.currentGame) return
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const player = await apiClient.assignCard(state.currentGame.id, playerName, cardNumber)
      dispatch({ type: 'ADD_PLAYER', payload: player })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const verifyWinner = async (cardNumber: number) => {
    if (!state.currentGame) return
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const result = await apiClient.verifyWinner(state.currentGame.id, cardNumber)
      
      if (result.isWinner) {
        dispatch({ type: 'SET_GAME_RUNNING', payload: false })
        dispatch({ type: 'SET_GAME', payload: { ...state.currentGame, status: 'finished' } })
        return result
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' })
  }

  const value: GameContextType = {
    ...state,
    createGame,
    startGame,
    assignCard,
    verifyWinner,
    resetGame
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}