'use client'

import { useEffect, useState } from 'react'

interface WinnerModalProps {
  winner: any
  totalPlayers: number
  calledNumbers: number[]
  onClose: () => void
}

export default function WinnerModal({ winner, totalPlayers, calledNumbers, onClose }: WinnerModalProps) {
  const [cardGrid, setCardGrid] = useState<any>(null)
  
  const prize = winner.prize || 0
  const totalPot = winner.totalPot || 0
  const platformFee = winner.platformFee || 0

  useEffect(() => {
    if (winner?.card) {
      setCardGrid(winner.card)
    }
  }, [winner])

  const getPatternDescription = (pattern: any) => {
    if (!pattern) return 'Unknown Pattern'
    
    switch (pattern.type) {
      case 'horizontal':
        return `Horizontal Line ${pattern.line + 1}`
      case 'vertical':
        return `Vertical Line ${pattern.line + 1}`
      case 'diagonal':
        return pattern.line === 'main' ? 'Main Diagonal' : 'Anti Diagonal'
      case 'full_house':
        return 'Full House'
      default:
        return 'Winning Pattern'
    }
  }

  const isWinningCell = (row: number, col: number) => {
    const pattern = winner.winningPattern
    if (!pattern) return false
    
    switch (pattern.type) {
      case 'horizontal':
        return row === pattern.line
      case 'vertical':
        return col === pattern.line
      case 'diagonal':
        if (pattern.line === 'main') {
          return row === col
        } else {
          return row + col === 4
        }
      case 'full_house':
        return true
      default:
        return false
    }
  }

  const renderWinningCard = () => {
    if (!cardGrid) {
      return <div className="text-white text-sm">Loading card...</div>
    }
    
    return (
      <div className="bg-white rounded-lg p-3 shadow-lg">
        <div className="text-center text-sm font-bold mb-3 text-gray-700">
          {getPatternDescription(winner.winningPattern)}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {/* Headers */}
          <div className="bg-sky-400 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">B</div>
          <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">I</div>
          <div className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">N</div>
          <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">G</div>
          <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">O</div>
          
          {/* Card numbers */}
          {[0,1,2,3,4].map(row => 
            [cardGrid[0][row], cardGrid[1][row], cardGrid[2][row], cardGrid[3][row], cardGrid[4][row]].map((num, col) => {
              const isFree = num === 'FREE'
              const isWinning = isWinningCell(row, col)
              const isCalled = calledNumbers.includes(num)
              
              return (
                <div key={`${row}-${col}`} className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-bold ${
                  isFree
                    ? 'bg-yellow-300 border-yellow-500'
                    : isWinning
                    ? 'bg-green-400 border-green-600 text-white'
                    : isCalled
                    ? 'bg-blue-200 border-blue-400'
                    : 'bg-gray-100 border-gray-300'
                }`}>
                  {isFree ? '★' : num}
                </div>
              )
            })
          )}
        </div>
        <div className="mt-2 text-xs text-gray-600 text-center">
          <span className="inline-block w-3 h-3 bg-green-400 mr-1"></span>Winning Pattern
          <span className="inline-block w-3 h-3 bg-blue-200 ml-3 mr-1"></span>Called Numbers
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-4xl font-bold mb-4 text-white">🏆 WINNER!</h2>
        
        <div className="mb-6">
          <div className="text-2xl font-bold text-white mb-2">{winner.player?.player_name || winner.name}</div>
          <div className="text-lg text-white mb-4">Card #{winner.player?.selected_card_number || winner.cardNumber}</div>

          
          <div className="mb-4">
            {cardGrid ? renderWinningCard() : (
              <div className="text-white text-sm">Loading winning card...</div>
            )}
          </div>
          
          <div className="bg-green-500 text-white p-4 rounded-xl mt-4">
            <div className="text-sm">Total Prize Won</div>
            <div className="text-3xl font-bold">{prize} ETB</div>
            <div className="text-xs mt-2 space-y-1">
              <div>Total Pot: {totalPot} ETB</div>
              <div>Platform Fee (20%): -{platformFee} ETB</div>
              <div className="border-t pt-1 font-bold">Net Prize: {prize} ETB</div>
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          🎉 Start Next Game
        </button>
      </div>
    </div>
  )
}