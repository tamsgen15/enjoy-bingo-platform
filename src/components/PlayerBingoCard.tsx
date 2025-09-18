'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface PlayerBingoCardProps {
  cardNumber: number
  calledNumbers: number[]
  playerName: string
}

export default function PlayerBingoCard({ cardNumber, calledNumbers, playerName }: PlayerBingoCardProps) {
  const [cardData, setCardData] = useState<any>(null)
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([])

  useEffect(() => {
    const fetchCard = async () => {
      const { data } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('card_number', cardNumber)
        .single()
      
      if (data) {
        setCardData({
          b: data.b_column,
          i: data.i_column,
          n: [...data.n_column.slice(0, 2), 'FREE', ...data.n_column.slice(2)],
          g: data.g_column,
          o: data.o_column
        })
      }
    }
    fetchCard()
  }, [cardNumber])

  const markNumber = (number: number) => {
    if (calledNumbers.includes(number) && !markedNumbers.includes(number)) {
      setMarkedNumbers(prev => [...prev, number])
    }
  }

  if (!cardData) return <div className="text-white">Loading card...</div>

  return (
    <div className="enjot-card p-4">
      <h3 className="text-lg font-bold text-white mb-3 text-center">
        {playerName} - Card #{cardNumber}
      </h3>
      <div className="grid grid-cols-5 gap-0.5 sm:gap-1 max-w-xs mx-auto">
        {/* Headers */}
        <div className="font-bold text-center bg-sky-400 text-white w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base">B</div>
        <div className="font-bold text-center bg-red-500 text-white w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base">I</div>
        <div className="font-bold text-center bg-yellow-500 text-white w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base">N</div>
        <div className="font-bold text-center bg-green-500 text-white w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base">G</div>
        <div className="font-bold text-center bg-orange-500 text-white w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base">O</div>
        
        {/* Numbers */}
        {[0,1,2,3,4].map(row => 
          [cardData.b[row], cardData.i[row], cardData.n[row], cardData.g[row], cardData.o[row]].map((num, col) => {
            const isCalled = calledNumbers.includes(num)
            const isMarked = markedNumbers.includes(num)
            const isFree = num === 'FREE'
            
            return (
              <button
                key={`${row}-${col}`}
                onClick={() => !isFree && markNumber(num)}
                disabled={!isCalled || isFree}
                className={`w-6 h-6 sm:w-10 sm:h-10 text-xs sm:text-sm font-bold border rounded transition-all flex items-center justify-center ${
                  isFree 
                    ? 'bg-yellow-300 text-black border-yellow-400' 
                    : isMarked
                    ? 'bg-green-500 text-white border-green-600'
                    : isCalled
                    ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-400 border-gray-300'
                }`}
              >
                {isFree ? '★' : num}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}