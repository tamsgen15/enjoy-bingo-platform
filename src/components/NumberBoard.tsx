'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface NumberBoardProps {
  tenantId?: string
  gameId?: string
}

export default function NumberBoard({ tenantId, gameId }: NumberBoardProps) {
  const [calledNumbers, setCalledNumbers] = useState<number[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  
  useEffect(() => {
    if (!gameId || !tenantId) return
    
    loadCalledNumbers()
    
    const channel = supabase
      .channel(`numberboard_${tenantId}_${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'called_numbers',
        filter: `game_id=eq.${gameId}&tenant_id=eq.${tenantId}`
      }, (payload) => {
        const newNumber = payload.new.number
        setCurrentNumber(newNumber)
        setCalledNumbers(prev => {
          if (!prev.includes(newNumber)) {
            return [...prev, newNumber]
          }
          return prev
        })
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, tenantId])

  const loadCalledNumbers = async () => {
    if (!gameId || !tenantId) return

    const { data } = await supabase
      .from('called_numbers')
      .select('number')
      .eq('game_id', gameId)
      .eq('tenant_id', tenantId)
      .order('called_at', { ascending: true })
    
    if (data) {
      const numbers = data.map(item => item.number)
      setCalledNumbers(numbers)
      if (numbers.length > 0) {
        setCurrentNumber(numbers[numbers.length - 1])
      }
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
      case 'called':
        return 'bg-green-600 text-white'
      default:
        return 'bg-white/20 text-white/50'
    }
  }

  const getHeaderColor = (letter: string) => {
    switch(letter) {
      case 'B': return 'bg-sky-400 text-white'
      case 'I': return 'bg-red-500 text-white'
      case 'N': return 'bg-yellow-500 text-white'
      case 'G': return 'bg-green-500 text-white'
      case 'O': return 'bg-orange-500 text-white'
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
              className={`w-3 h-3 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 flex items-center justify-center text-xs md:text-xs lg:text-sm font-bold rounded transition-all duration-200 ${getNumberStyle(status)}`}
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
      <div className="space-y-0.5 md:space-y-1">
        {renderRow('B', bNumbers)}
        {renderRow('I', iNumbers)}
        {renderRow('N', nNumbers)}
        {renderRow('G', gNumbers)}
        {renderRow('O', oNumbers)}
      </div>
    </div>
  )
}