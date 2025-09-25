'use client'

import React, { useEffect, useState } from 'react'
import { WinningVerificationService } from '@/lib/winningVerificationService'
import { supabase } from '@/lib/supabase'

interface WinnerModalProps {
  winner: any
  totalPlayers: number
  calledNumbers: number[]
  onClose: () => void
  tenantId?: string
  gameId?: string
  currentGame?: any
}

export default function WinnerModal({ winner, totalPlayers, calledNumbers, onClose, tenantId, gameId, currentGame }: WinnerModalProps) {
  const [cardGrid, setCardGrid] = useState<any>(null)
  const [winningPattern, setWinningPattern] = useState<any>(null)
  const [markedPositions, setMarkedPositions] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [gameData, setGameData] = useState(currentGame)
  
  // Calculate real-time prize based on current game settings
  const entryFee = gameData?.entry_fee || currentGame?.entry_fee || 20
  const platformFeePercent = gameData?.platform_fee_percent || currentGame?.platform_fee_percent || 20
  const totalPot = totalPlayers * entryFee
  const platformFee = Math.round(totalPot * (platformFeePercent / 100))
  const prize = totalPot - platformFee
  
  const cardNumber = winner.player?.card_number || winner.cardNumber
  const patternName = winner.pattern?.name || winner.winPattern

  useEffect(() => {
    if (!tenantId || !gameId) return
    
    // Real-time subscription for game settings updates
    const channel = supabase
      .channel(`winner_game_${tenantId}_${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        // Update game data when settings change
        if (payload.new.tenant_id === tenantId) {
          setGameData(payload.new)
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, gameId])
  
  useEffect(() => {
    const fetchCardData = async () => {
      if (!cardNumber) {
        setLoading(false)
        return
      }
      
      try {
        // First try to use card data from winner object
        if (winner.cardData) {
          const data = winner.cardData
          const grid = [
            data.b_column || [],
            data.i_column || [],
            [...(data.n_column || []).slice(0, 2), 'FREE', ...(data.n_column || []).slice(2)],
            data.g_column || [],
            data.o_column || []
          ]
          setCardGrid(grid)
          setMarkedPositions(winner.markedPositions || [12])
          
          if (winner.pattern) {
            setWinningPattern({
              name: winner.pattern.name,
              description: winner.pattern.description,
              positions: winner.pattern.pattern_positions || WinningVerificationService.getPatternPositions(winner.pattern.name)
            })
          }
          setLoading(false)
          return
        }
        
        // Fallback - fetch card data from API
        const response = await fetch(`/api/bingo-cards/${cardNumber}`)
        if (response.ok) {
          const data = await response.json()
          const grid = [
            data.b_column || [],
            data.i_column || [],
            [...(data.n_column || []).slice(0, 2), 'FREE', ...(data.n_column || []).slice(2)],
            data.g_column || [],
            data.o_column || []
          ]
          setCardGrid(grid)
          setMarkedPositions(winner.markedPositions || [12])
          
          if (winner.pattern || patternName) {
            setWinningPattern({
              name: winner.pattern?.name || patternName,
              description: winner.pattern?.description || WinningVerificationService.getPatternDescription(patternName),
              positions: winner.pattern?.pattern_positions || WinningVerificationService.getPatternPositions(winner.pattern?.name || patternName)
            })
          }
        } else {
          throw new Error('Failed to fetch card data')
        }
      } catch (error) {
        console.error('Error fetching card data:', error)
        // Final fallback
        const fallbackGrid = [
          [1,2,3,4,5],
          [16,17,18,19,20],
          [31,32,'FREE',34,35],
          [46,47,48,49,50],
          [61,62,63,64,65]
        ]
        setCardGrid(fallbackGrid)
        setMarkedPositions([12])
      } finally {
        setLoading(false)
      }
    }
    
    fetchCardData()
  }, [cardNumber, winner, patternName])

  // Convert position index to row/col coordinates
  const positionToCoords = (position: number) => {
    return {
      row: Math.floor(position / 5),
      col: position % 5
    }
  }

  const getPatternDescription = () => {
    if (!winningPattern) return 'Winning Pattern'
    return winningPattern.description || winningPattern.name || 'Winning Pattern'
  }
  
  const getWinningColumnLetter = () => {
    if (!winningPattern?.name) return ''
    
    const name = winningPattern.name
    if (name.includes('B Column')) return 'B'
    if (name.includes('I Column')) return 'I'
    if (name.includes('N Column')) return 'N'
    if (name.includes('G Column')) return 'G'
    if (name.includes('O Column')) return 'O'
    if (name.includes('Row')) return 'ROW'
    if (name.includes('Diagonal')) return 'DIAG'
    if (name.includes('Corners')) return 'CORNERS'
    if (name.includes('Full House')) return 'FULL'
    return ''
  }

  const isWinningCell = (row: number, col: number) => {
    if (!winningPattern?.positions) return false
    const position = row * 5 + col
    return winningPattern.positions.includes(position)
  }
  
  const isMarkedCell = (row: number, col: number) => {
    const position = row * 5 + col
    return markedPositions.includes(position) || (row === 2 && col === 2) // Center is always marked
  }

  const renderWinningCard = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="text-center text-gray-500">Loading bingo card...</div>
        </div>
      )
    }
    
    if (!cardGrid || !Array.isArray(cardGrid) || cardGrid.length !== 5) {
      return (
        <div className="bg-white rounded-lg p-4 shadow-lg">
          <div className="text-center text-lg font-bold mb-3 text-gray-800">
            Winner Card #{cardNumber}
          </div>
          <div className="text-center text-red-500">Card data unavailable</div>
        </div>
      )
    }
    
    return (
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <div className="text-center text-sm sm:text-base font-bold mb-2 text-gray-800">
          🏆 {getPatternDescription()}
          {getWinningColumnLetter() && (
            <div className="text-lg sm:text-xl font-bold text-green-600 mt-1">
              {getWinningColumnLetter()}
            </div>
          )}
        </div>
        <div className="grid grid-cols-5 gap-0.5 mb-2 max-w-40 mx-auto">
          {/* Headers */}
          <div className="bg-sky-400 text-white w-7 h-5 rounded flex items-center justify-center text-xs font-bold">B</div>
          <div className="bg-red-500 text-white w-7 h-5 rounded flex items-center justify-center text-xs font-bold">I</div>
          <div className="bg-yellow-500 text-white w-7 h-5 rounded flex items-center justify-center text-xs font-bold">N</div>
          <div className="bg-green-500 text-white w-7 h-5 rounded flex items-center justify-center text-xs font-bold">G</div>
          <div className="bg-orange-500 text-white w-7 h-5 rounded flex items-center justify-center text-xs font-bold">O</div>
          
          {/* Card numbers */}
          {[0,1,2,3,4].map(row => 
            [cardGrid[0][row], cardGrid[1][row], cardGrid[2][row], cardGrid[3][row], cardGrid[4][row]].map((num, col) => {
              const isFree = num === 'FREE'
              const isWinning = isWinningCell(row, col)
              const isMarked = isMarkedCell(row, col)
              const isCalled = calledNumbers.includes(num)
              
              return (
                <div key={`${row}-${col}`} className={`w-7 h-5 border rounded flex items-center justify-center text-xs font-bold transition-all ${
                  isFree
                    ? 'bg-yellow-300 border-yellow-500 text-yellow-800'
                    : isWinning
                    ? 'bg-green-500 border-green-600 text-white shadow-md'
                    : isMarked
                    ? 'bg-blue-200 border-blue-400 text-blue-800'
                    : isCalled
                    ? 'bg-purple-200 border-purple-400 text-purple-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700'
                }`}>
                  {isFree ? '★' : num}
                </div>
              )
            })
          )}
        </div>
        <div className="text-xs text-gray-600 text-center space-y-1">
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-green-500 mr-1 rounded ring-1 ring-green-300"></span>
              <span className="text-green-700 font-medium">Winning Pattern</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-200 mr-1 rounded"></span>
              <span>Marked</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-purple-200 mr-1 rounded"></span>
              <span>Called</span>
            </div>
          </div>
          <div className="text-gray-500 font-medium">Card #{cardNumber}</div>
          {winningPattern && (
            <div className="text-green-600 font-bold text-sm">
              🏆 {winningPattern.name}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-white/20 backdrop-blur-lg rounded-xl shadow-2xl border border-white/30 p-4 sm:p-6 max-w-sm sm:max-w-md w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">🏆 WINNER!</h2>
        
        <div className="mb-6">
          <div className="text-lg sm:text-xl font-bold text-white mb-1">{winner.player?.player_name || winner.name}</div>
          <div className="text-sm sm:text-base text-white mb-3">Card #{winner.player?.card_number || winner.cardNumber}</div>

          
          <div className="mb-4">
            {renderWinningCard()}
          </div>
          
          <div className="bg-green-500 text-white p-3 sm:p-4 rounded-lg mt-3">
            <div className="text-xs sm:text-sm">Total Prize Won</div>
            <div className="text-xl sm:text-2xl font-bold">{prize} ETB</div>
            <div className="text-xs mt-1 space-y-0.5">
              <div>Total Pot: {totalPot} ETB</div>
              <div>Platform Fee ({platformFeePercent}%): -{platformFee} ETB</div>
              <div className="border-t pt-1 font-bold">Net Prize: {prize} ETB</div>
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-3 sm:py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm sm:text-base"
        >
          🎉 Start Next Game
        </button>
      </div>
    </div>
  )
}