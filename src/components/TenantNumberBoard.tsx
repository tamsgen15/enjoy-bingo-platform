'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TenantNumberBoardProps {
  tenantId: string
  gameId?: string
  sessionId?: string
}

export default function TenantNumberBoard({ tenantId, gameId, sessionId }: TenantNumberBoardProps) {
  const [calledNumbers, setCalledNumbers] = useState<number[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  
  useEffect(() => {
    if (!gameId || !tenantId) {
      // Reset when no game
      setCalledNumbers([])
      setCurrentNumber(null)
      return
    }
    
    loadCalledNumbers()
    
    // Listen for reset events
    const handleReset = (event: CustomEvent) => {
      if (event.detail.tenantId === tenantId) {
        setCalledNumbers([])
        setCurrentNumber(null)
      }
    }
    
    window.addEventListener('resetBingoBoard', handleReset as EventListener)
    
    // Setup tenant-specific real-time subscription
    const channel = supabase
      .channel(`tenant_numberboard_${tenantId}_${gameId}_${sessionId || 'default'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'called_numbers',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        // Only process if this belongs to our tenant
        if (payload.new.tenant_id === tenantId) {
          const newNumber = payload.new.number
          setCurrentNumber(newNumber)
          setCalledNumbers(prev => {
            if (!prev.includes(newNumber)) {
              // Play audio using singleton manager
              const playAudio = async () => {
                const { tenantAudioManager } = await import('@/lib/TenantAudioManager')
                await tenantAudioManager.playNumber(newNumber, tenantId)
              }
              playAudio()
              
              return [...prev, newNumber].sort((a, b) => a - b)
            }
            return prev
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        // Update current number from game state
        if (payload.new.tenant_id === tenantId && payload.new.current_number) {
          setCurrentNumber(payload.new.current_number)
        }
      })
      .subscribe()
    
    return () => {
      window.removeEventListener('resetBingoBoard', handleReset as EventListener)
      supabase.removeChannel(channel)
    }
  }, [gameId, tenantId, sessionId])

  const loadCalledNumbers = async () => {
    if (!gameId || !tenantId) return

    try {
      let query = supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', gameId)
        .eq('tenant_id', tenantId)
        .order('called_at', { ascending: true })
      
      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data } = await query
      
      if (data) {
        const numbers = data.map(item => item.number)
        setCalledNumbers(numbers)
        if (numbers.length > 0) {
          setCurrentNumber(numbers[numbers.length - 1])
        }
      }

      // Also get current number from game state
      const { data: gameData } = await supabase
        .from('games')
        .select('current_number')
        .eq('id', gameId)
        .eq('tenant_id', tenantId)
        .single()
      
      if (gameData?.current_number) {
        setCurrentNumber(gameData.current_number)
      }
    } catch (error) {
      console.error('Error loading called numbers:', error)
    }
  }

  const bNumbers = Array.from({ length: 15 }, (_, i) => i + 1)
  const iNumbers = Array.from({ length: 15 }, (_, i) => i + 16)
  const nNumbers = Array.from({ length: 15 }, (_, i) => i + 31)
  const gNumbers = Array.from({ length: 15 }, (_, i) => i + 46)
  const oNumbers = Array.from({ length: 15 }, (_, i) => i + 61)

  const getNumberStatus = (num: number) => {
    if (num === currentNumber) return 'current'
    if (calledNumbers.includes(num)) return 'called'
    return 'pending'
  }

  const getNumberStyle = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-400 text-black animate-pulse scale-110 ring-2 ring-green-300 shadow-lg font-bold'
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

  const renderRow = (letter: string, numbers: number[]) => (
    <div className="flex items-center gap-0.5 md:gap-1 lg:gap-2 mb-0.5 md:mb-1 w-full">
      <div className={`font-black text-xs md:text-sm lg:text-base w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 xl:w-9 xl:h-9 flex items-center justify-center rounded-full shadow-lg flex-shrink-0 ${getHeaderColor(letter)}`}>
        {letter}
      </div>
      <div className="flex gap-0.5 md:gap-0.5 lg:gap-1 flex-1 justify-between">
        {numbers.map((num) => {
          const status = getNumberStatus(num)
          return (
            <div
              key={num}
              className={`w-3 h-3 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 flex items-center justify-center text-xs md:text-xs lg:text-sm font-bold rounded transition-all duration-300 ${getNumberStyle(status)}`}
            >
              {num}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="w-full p-0.5 md:p-1 lg:p-2 xl:p-3 max-w-full overflow-hidden">
      {/* Current Number Display */}
      {currentNumber && (
        <div className="text-center mb-4">
          <div className="text-white/70 text-sm mb-2">Current Number</div>
          <div className="text-green-400 font-bold text-4xl md:text-6xl animate-pulse">
            {currentNumber <= 15 ? 'B' : 
             currentNumber <= 30 ? 'I' : 
             currentNumber <= 45 ? 'N' : 
             currentNumber <= 60 ? 'G' : 'O'}{currentNumber}
          </div>
          <div className="text-white/50 text-xs mt-1">
            {calledNumbers.length} of 75 numbers called
          </div>
        </div>
      )}
      
      {/* Number Board */}
      <div className="space-y-0.5 md:space-y-1">
        {renderRow('B', bNumbers)}
        {renderRow('I', iNumbers)}
        {renderRow('N', nNumbers)}
        {renderRow('G', gNumbers)}
        {renderRow('O', oNumbers)}
      </div>
      
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 text-xs text-white/50">
          Tenant: {tenantId.slice(0, 8)}... | Game: {gameId?.slice(0, 8)}... | Session: {sessionId?.slice(0, 8) || 'none'}
        </div>
      )}
    </div>
  )
}