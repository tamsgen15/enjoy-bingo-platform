'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface RealtimeBingoBoardProps {
  gameId: string
  tenantId?: string | null
}

interface GameStatus {
  status: string
  players_count: number
  numbers_called: number
  total_pot: number
  platform_fee_percent: number
  winner_prize: number
  current_number: number | null
}

export default function RealtimeBingoBoard({ gameId, tenantId }: RealtimeBingoBoardProps) {
  const [calledNumbers, setCalledNumbers] = useState<number[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    status: 'waiting',
    players_count: 0,
    numbers_called: 0,
    total_pot: 0,
    platform_fee_percent: 0,
    winner_prize: 0,
    current_number: null
  })

  useEffect(() => {
    if (!gameId) return

    // Load initial data
    loadGameData()

    // Setup real-time subscriptions
    const gameChannel = supabase
      .channel(`realtime_game_${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        setCurrentNumber(payload.new.current_number)
        setGameStatus(prev => ({
          ...prev,
          status: payload.new.status,
          current_number: payload.new.current_number
        }))
      })
      .subscribe()

    let numbersFilter = `game_id=eq.${gameId}`
    if (tenantId) {
      numbersFilter += `&tenant_id=eq.${tenantId}`
    }

    const numbersChannel = supabase
      .channel(`realtime_numbers_${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'called_numbers',
        filter: numbersFilter
      }, (payload) => {
        const newNumber = payload.new.number
        setCalledNumbers(prev => {
          if (!prev.includes(newNumber)) {
            return [...prev, newNumber]
          }
          return prev
        })
        setCurrentNumber(newNumber)
        setGameStatus(prev => ({
          ...prev,
          numbers_called: prev.numbers_called + 1,
          current_number: newNumber
        }))
      })
      .subscribe()

    let playersFilter = `game_id=eq.${gameId}`
    if (tenantId) {
      playersFilter += `&tenant_id=eq.${tenantId}`
    }

    const playersChannel = supabase
      .channel(`realtime_players_${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: playersFilter
      }, () => {
        loadGameData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gameChannel)
      supabase.removeChannel(numbersChannel)
      supabase.removeChannel(playersChannel)
    }
  }, [gameId, tenantId])

  const loadGameData = async () => {
    try {
      // Load game info
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      // Load players count
      let playersQuery = supabase
        .from('players')
        .select('*', { count: 'exact' })
        .eq('game_id', gameId)
      
      if (tenantId) {
        playersQuery = playersQuery.eq('tenant_id', tenantId)
      }
      
      const { count: playersCount } = await playersQuery

      // Load called numbers
      let numbersQuery = supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', gameId)
        .order('called_at', { ascending: true })
      
      if (tenantId) {
        numbersQuery = numbersQuery.eq('tenant_id', tenantId)
      }
      
      const { data: numbers } = await numbersQuery

      if (game) {
        const entryFee = game.entry_fee || 20
        const platformFeePercent = game.platform_fee_percent || 0
        const totalPot = (playersCount || 0) * entryFee
        const winnerPrize = totalPot - (totalPot * (platformFeePercent / 100))

        setGameStatus({
          status: game.status,
          players_count: playersCount || 0,
          numbers_called: numbers?.length || 0,
          total_pot: totalPot,
          platform_fee_percent: platformFeePercent,
          winner_prize: winnerPrize,
          current_number: game.current_number
        })

        setCalledNumbers(numbers?.map(n => n.number) || [])
        setCurrentNumber(game.current_number)
      }
    } catch (error) {
      console.error('Error loading game data:', error)
    }
  }

  const getNumberStatus = (num: number) => {
    if (num === currentNumber) return 'current'
    if (calledNumbers.includes(num)) return 'called'
    return 'pending'
  }

  const getNumberStyle = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-400 text-black animate-pulse scale-110 ring-2 ring-green-300 shadow-lg'
      case 'called':
        return 'bg-green-600 text-white shadow-md'
      default:
        return 'bg-white/20 text-white/50'
    }
  }

  const getHeaderColor = (letter: string) => {
    switch(letter) {
      case 'B': return 'bg-blue-600 text-white'
      case 'I': return 'bg-red-600 text-white'
      case 'N': return 'bg-yellow-600 text-white'
      case 'G': return 'bg-green-600 text-white'
      case 'O': return 'bg-orange-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="bg-white/10 backdrop-blur-lg border-white/20 border rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">🎯 Game Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-white/70 text-xs mb-1">Status</div>
            <div className={`font-bold text-sm ${
              gameStatus.status === 'active' ? 'text-green-400' :
              gameStatus.status === 'waiting' ? 'text-yellow-400' :
              gameStatus.status === 'paused' ? 'text-orange-400' : 'text-gray-400'
            }`}>
              {gameStatus.status.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-1">Players</div>
            <div className="text-white font-bold text-sm">{gameStatus.players_count}</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-1">Numbers Called</div>
            <div className="text-white font-bold text-sm">{gameStatus.numbers_called}/75</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-1">Total Pot</div>
            <div className="text-blue-400 font-bold text-sm">{gameStatus.total_pot} ETB</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-1">Platform Fee</div>
            <div className="text-red-400 font-bold text-sm">{gameStatus.platform_fee_percent}%</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-1">Winner Prize</div>
            <div className="text-yellow-400 font-bold text-sm">{Math.round(gameStatus.winner_prize)} ETB</div>
          </div>
        </div>
        
        {currentNumber && (
          <div className="text-center mt-4">
            <div className="text-white/70 text-sm mb-2">Current Number</div>
            <div className="text-green-400 font-bold text-6xl animate-pulse">
              {currentNumber <= 15 ? 'B' : 
               currentNumber <= 30 ? 'I' : 
               currentNumber <= 45 ? 'N' : 
               currentNumber <= 60 ? 'G' : 'O'}{currentNumber}
            </div>
          </div>
        )}
      </div>

      {/* BINGO Number Board */}
      <div className="bg-white/10 backdrop-blur-lg border-white/20 border rounded-lg p-4">
        <h3 className="text-white text-center text-2xl font-semibold mb-4">📋 BINGO NUMBER BOARD</h3>
        <div className="grid grid-cols-5 gap-2">
          {/* Headers */}
          <div className={`font-bold text-center py-2 rounded text-lg ${getHeaderColor('B')}`}>B</div>
          <div className={`font-bold text-center py-2 rounded text-lg ${getHeaderColor('I')}`}>I</div>
          <div className={`font-bold text-center py-2 rounded text-lg ${getHeaderColor('N')}`}>N</div>
          <div className={`font-bold text-center py-2 rounded text-lg ${getHeaderColor('G')}`}>G</div>
          <div className={`font-bold text-center py-2 rounded text-lg ${getHeaderColor('O')}`}>O</div>
          
          {/* Numbers 1-75 in BINGO format */}
          {Array.from({length: 15}, (_, row) => 
            [1, 16, 31, 46, 61].map((start, col) => {
              const num = start + row
              const status = getNumberStatus(num)
              
              return (
                <div
                  key={num}
                  className={`h-10 rounded flex items-center justify-center text-sm font-bold transition-all duration-300 ${getNumberStyle(status)}`}
                >
                  {num}
                </div>
              )
            })
          ).flat()}
        </div>
      </div>
    </div>
  )
}