'use client'

import { useRealtimeGame } from '@/lib/RealtimeGameContext'

interface StatsCardProps {
  currentNumber?: number | null
  totalCalled?: number
  playersCount?: number
  gameStatus?: string
}

export default function StatsCard(props: StatsCardProps) {
  const { currentNumber, calledNumbers, players, currentGame } = useRealtimeGame()
  
  // Use real-time data or fallback to props
  const displayNumber = currentNumber ?? props.currentNumber
  const displayCalled = calledNumbers.length ?? props.totalCalled ?? 0
  const displayPlayers = players.length ?? props.playersCount ?? 0
  const displayStatus = currentGame?.status ?? props.gameStatus ?? 'waiting'
  
  const getBingoLetter = (number: number | null) => {
    if (!number) return ''
    if (number >= 1 && number <= 15) return 'B'
    if (number >= 16 && number <= 30) return 'I'
    if (number >= 31 && number <= 45) return 'N'
    if (number >= 46 && number <= 60) return 'G'
    if (number >= 61 && number <= 75) return 'O'
    return ''
  }
  return (
    <div className="stats-card">
      <h3 className="text-xl font-bold text-white mb-6 text-center">📊 Game Stats</h3>
      
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {displayNumber && (
              <div className="text-5xl font-black text-yellow-400">
                {getBingoLetter(displayNumber)}
              </div>
            )}
            <div className="text-5xl font-black bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
              {displayNumber || '--'}
            </div>
          </div>
          <div className="text-sm text-white/80">Current Number</div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-blue-300">{displayCalled}</div>
            <div className="text-xs text-white/70">Called</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-green-300">{displayPlayers}</div>
            <div className="text-xs text-white/70">Players</div>
          </div>
        </div>

        <div className="text-center">
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
            displayStatus === 'active' ? 'bg-green-500 text-white' :
            displayStatus === 'waiting' ? 'bg-yellow-500 text-black' :
            'bg-gray-500 text-white'
          }`}>
            {displayStatus === 'active' ? '🔴 LIVE' : 
             displayStatus === 'waiting' ? '⏳ WAITING' : 
             displayStatus.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  )
}