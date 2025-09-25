'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GameStatusProps {
  gameId?: string
  tenantId?: string
  players: any[]
  entryFee: number
  platformFeePercent: number
}

interface GameData {
  id: string
  status: string
  current_number?: number
}

interface CalledNumber {
  number: number
  called_at: string
}

export default function GameStatus({ gameId, tenantId, players, entryFee, platformFeePercent }: GameStatusProps) {
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [calledNumbers, setCalledNumbers] = useState<CalledNumber[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)

  useEffect(() => {
    if (!gameId || !tenantId) return

    loadGameData()
    loadCalledNumbers()

    const gameChannel = supabase
      .channel(`game_status_${tenantId}_${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}&tenant_id=eq.${tenantId}`
      }, (payload) => {
        setGameData(payload.new as GameData)
        setCurrentNumber(payload.new.current_number)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'called_numbers',
        filter: `game_id=eq.${gameId}&tenant_id=eq.${tenantId}`
      }, (payload) => {
        const newNumber = payload.new.number
        setCurrentNumber(newNumber)
        setCalledNumbers(prev => {
          if (!prev.some(n => n.number === newNumber)) {
            return [...prev, { number: newNumber, called_at: payload.new.called_at }]
          }
          return prev
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gameChannel)
    }
  }, [gameId, tenantId])

  const loadGameData = async () => {
    if (!gameId || !tenantId) return

    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('tenant_id', tenantId)
      .single()

    if (data) {
      setGameData(data)
      setCurrentNumber(data.current_number)
    }
  }

  const loadCalledNumbers = async () => {
    if (!gameId || !tenantId) return

    const { data } = await supabase
      .from('called_numbers')
      .select('*')
      .eq('game_id', gameId)
      .eq('tenant_id', tenantId)
      .order('called_at', { ascending: true })

    if (data) {
      setCalledNumbers(data)
      if (data.length > 0) {
        setCurrentNumber(data[data.length - 1].number)
      }
    }
  }

  if (!gameData) return null

  const totalPot = players.length * entryFee
  const platformFee = totalPot * (platformFeePercent / 100)
  const winnerPrize = totalPot - platformFee

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white">🎯 Game Status</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-1 text-sm">
          <div>
            <div className="text-white/70 text-xs mb-0.5">Game ID</div>
            <div className="text-white font-bold text-xs">{gameData.id.slice(0, 8)}...</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-0.5">Status</div>
            <div className={`font-bold text-xs ${
              gameData.status === 'active' ? 'text-green-400' :
              gameData.status === 'waiting' ? 'text-yellow-400' :
              gameData.status === 'paused' ? 'text-orange-400' : 'text-gray-400'
            }`}>
              {gameData.status?.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-0.5">Players</div>
            <div className="text-white font-bold text-xs">{players.length}</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-0.5">Numbers Called</div>
            <div className="text-white font-bold text-xs">{calledNumbers.length}/75</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-0.5">Total Pot</div>
            <div className="text-blue-400 font-bold text-xs">{totalPot} ETB</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-0.5">Winner Prize</div>
            <div className="text-yellow-400 font-bold text-xs">{winnerPrize} ETB</div>
          </div>
          {currentNumber && (
            <div className="col-span-2 text-center mt-2">
              <div className="text-white/70 text-xs mb-1">Current Number</div>
              <div className="text-green-400 font-bold text-8xl animate-pulse">
                {currentNumber <= 15 ? 'B' : 
                 currentNumber <= 30 ? 'I' : 
                 currentNumber <= 45 ? 'N' : 
                 currentNumber <= 60 ? 'G' : 'O'}{currentNumber}
              </div>
            </div>
          )}
          <div className="col-span-2 text-center mt-2">
            <div className="text-white/70 text-xs mb-1">
              {calledNumbers.length > 0 ? `Current: ${calledNumbers.length} of 75` : 'Waiting for next call...'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}