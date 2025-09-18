'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import NumberBoard from '@/components/NumberBoard'
import PlayerBingoCard from '@/components/PlayerBingoCard'
import StatsCard from '@/components/StatsCard'
import NumberGrid from '@/components/NumberGrid'

import WinnerModal from '@/components/WinnerModal'
import { useRealtimeGame } from '@/lib/RealtimeGameContext'
import { useAuth } from '@/lib/AuthContext'
import { createPlayerCard, markNumber, checkForWinners } from '@/lib/bingoLogic'
import { setupRealtimeWinnerCheck } from '@/lib/realtimeWinnerCheck'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ProtectedRoute from '@/components/ProtectedRoute'

function CardPreview({ cardNumber }: { cardNumber: number }) {
  const [cardData, setCardData] = useState<any>(null)
  
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

  if (!cardData) return <div className="text-white">Loading...</div>

  return (
    <div className="border rounded p-2 bg-gray-50 w-fit">
      <div className="grid grid-cols-5 gap-0.5 text-xs">
        <div className="font-bold text-center bg-sky-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">B</div>
        <div className="font-bold text-center bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">I</div>
        <div className="font-bold text-center bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">N</div>
        <div className="font-bold text-center bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">G</div>
        <div className="font-bold text-center bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">O</div>
        
        {[0,1,2,3,4].map(row => 
          [cardData.b[row], cardData.i[row], cardData.n[row], cardData.g[row], cardData.o[row]].map((num, col) => (
            <div key={`${row}-${col}`} className={`text-center w-6 h-6 border flex items-center justify-center text-xs ${
              num === 'FREE' ? 'bg-yellow-300 font-bold' : 'bg-gray-100'
            }`}>
              {num === 'FREE' ? '★' : num}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function GameDetailPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string
  const [user, setUser] = useState<any>(null)
  
  const [currentGame, setCurrentGame] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [calledNumbers, setCalledNumbers] = useState<number[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  
  const [showAssignCards, setShowAssignCards] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [showWinnerCheck, setShowWinnerCheck] = useState(false)
  const [winnerCardInput, setWinnerCardInput] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [playerCard, setPlayerCard] = useState<any>(null)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [winner, setWinner] = useState<any>(null)
  const [gameStats, setGameStats] = useState({ pot: 0, duration: 0 })
  const [autoCall, setAutoCall] = useState(false)
  const [callInterval, setCallInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('username')
    const storedRole = localStorage.getItem('userRole')
    if (storedUser && storedRole) {
      setUser({ username: storedUser, role: storedRole })
    }
    
    if (!gameId || gameId === 'undefined') {
      router.push('/')
      return
    }
    
    loadGame()
    loadPlayers()
    
    return () => {
      if (callInterval) {
        clearInterval(callInterval)
      }
    }
  }, [gameId])
  
  // Reset modal state when game status changes
  useEffect(() => {
    if (currentGame?.status === 'waiting') {
      setPlayerName('')
      setSelectedCard(null)
      setShowAssignCards(false)
      setShowWinnerCheck(false)
      setWinnerCardInput('')
    }
  }, [currentGame?.status])

  useEffect(() => {
    setGameStats({
      pot: players.length * 20,
      duration: currentGame ? Math.floor((Date.now() - new Date(currentGame.created_at).getTime()) / 1000) : 0
    })
  }, [players, currentGame])

  const loadGame = async () => {
    try {
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()
      
      if (game) {
        setCurrentGame(game)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Game not found:', error)
      router.push('/')
    }
  }
  
  const loadPlayers = async () => {
    try {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
      
      if (data) {
        setPlayers(data)
      }
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }
  
  const startGame = async () => {
    try {
      await supabase
        .from('games')
        .update({ status: 'active' })
        .eq('id', gameId)
      
      loadGame()
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }
  
  const pauseGame = async () => {
    try {
      await supabase
        .from('games')
        .update({ status: 'paused' })
        .eq('id', gameId)
      
      loadGame()
    } catch (error) {
      console.error('Error pausing game:', error)
    }
  }
  
  const createGame = async () => {
    try {
      await supabase
        .from('games')
        .update({ status: 'waiting' })
        .eq('id', gameId)
      
      loadGame()
    } catch (error) {
      console.error('Error creating game:', error)
    }
  }

  const handleStartAutoCall = () => {
    if (autoCall) {
      if (callInterval) clearInterval(callInterval)
      setAutoCall(false)
      setCallInterval(null)
    } else {
      setAutoCall(true)
      const interval = setInterval(async () => {
        if (calledNumbers.length < 75) {
          await handleManualCall()
        } else {
          clearInterval(interval)
          setAutoCall(false)
        }
      }, 3000)
      setCallInterval(interval)
    }
  }

  const handleManualCall = async () => {
    if (calledNumbers.length < 75) {
      try {
        const availableNumbers = Array.from({length: 75}, (_, i) => i + 1)
          .filter(num => !calledNumbers.includes(num))
        
        if (availableNumbers.length > 0) {
          const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)]
          
          await supabase.from('called_numbers').insert({
            game_id: gameId,
            number: nextNumber
          })
          
          const { data: gamePlayers } = await supabase
            .from('players')
            .select('id')
            .eq('game_id', gameId)
          
          if (gamePlayers) {
            for (const player of gamePlayers) {
              await markNumber(player.id, nextNumber)
            }
          }
          
          setTimeout(async () => {
            const winners = await checkForWinners(gameId)
            if (winners.length > 0) {
              setWinner(winners[0])
              setShowWinnerModal(true)
              if (callInterval) {
                clearInterval(callInterval)
                setAutoCall(false)
              }
            }
          }, 1000)
        }
      } catch (error) {
        console.error('Error calling number:', error)
      }
    }
  }

  const currentPlayer = players.find(p => p.player_name === playerName)
  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              🎯 Bingo Game #{gameId?.slice(0, 8)}
            </h1>
            <div className="text-white/70 mt-1">
              Status: <span className={`font-bold ${
                currentGame?.status === 'active' ? 'text-green-400' :
                currentGame?.status === 'waiting' ? 'text-yellow-400' :
                currentGame?.status === 'paused' ? 'text-orange-400' : 'text-gray-400'
              }`}>
                {currentGame?.status?.toUpperCase() || 'LOADING'}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/game')}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              ← Games
            </Button>
            {isAdmin && (
              <Button
                onClick={() => router.push('/admin')}
                className="bg-red-600 hover:bg-red-700"
              >
                Admin Panel
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          
          {/* Left Sidebar - Stats */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">📊 Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentNumber && (
                  <div className="text-center p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
                    <div className="text-xs text-white/60">Current</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {currentNumber <= 15 ? 'B' : 
                       currentNumber <= 30 ? 'I' : 
                       currentNumber <= 45 ? 'N' : 
                       currentNumber <= 60 ? 'G' : 'O'}{currentNumber}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/70">Prize Pool:</span>
                    <span className="text-yellow-400 font-bold">{gameStats.pot} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Players:</span>
                    <span className="text-white">{players.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Called:</span>
                    <span className="text-white">{calledNumbers.length}/75</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Number Board */}
          <div className="lg:col-span-4">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center text-2xl">
                  📋 BINGO NUMBER BOARD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NumberBoard 
                  calledNumbers={calledNumbers}
                  currentNumber={currentNumber}
                />
                
                {/* Game Status Indicators */}
                <div className="mt-6 flex justify-center gap-4">
                  {autoCall && (
                    <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Auto-calling every 3 seconds
                    </div>
                  )}
                  
                  {currentGame?.status && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                      currentGame.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      currentGame.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                      currentGame.status === 'paused' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        currentGame.status === 'active' ? 'bg-green-400' :
                        currentGame.status === 'waiting' ? 'bg-yellow-400' :
                        currentGame.status === 'paused' ? 'bg-orange-400' :
                        'bg-gray-400'
                      }`}></div>
                      Game {currentGame.status}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Sidebar - Game Controls */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">🎮 Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Player Controls */}
                <div className="space-y-2">
                  <Button
                    onClick={() => router.push('/game')}
                    variant="outline"
                    className="w-full border-white/30 text-white hover:bg-white/10 py-2 text-xs"
                  >
                    ← Back to Games
                  </Button>
                </div>
                
                {/* Admin Controls */}
                <div className="space-y-2 pt-3 border-t border-white/20">
                  <div className="text-white/60 text-xs mb-1">🔧 Game Management:</div>
                  
                  {!currentGame && (
                    <Button
                      onClick={() => createGame()}
                      className="w-full bg-blue-600 hover:bg-blue-700 py-2 text-xs"
                    >
                      🎲 Create Game
                    </Button>
                  )}
                  
                  {currentGame?.status === 'waiting' && (
                    <>
                      <Button
                        onClick={() => setShowAssignCards(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 py-2 text-xs"
                      >
                        🏏 Assign Cards
                      </Button>
                      <Button
                        onClick={() => startGame()}
                        disabled={players.length < 1}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 text-xs"
                      >
                        🚀 Start Game
                      </Button>
                    </>
                  )}
                  
                  {currentGame?.status === 'active' && (
                    <>
                      <Button
                        onClick={handleStartAutoCall}
                        className={`w-full py-2 text-xs ${
                          autoCall 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {autoCall ? '⏹️ Stop Auto' : '▶️ Auto Call'}
                      </Button>
                      
                      <Button
                        onClick={handleManualCall}
                        disabled={calledNumbers.length >= 75}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-2 text-xs"
                      >
                        🎯 Call Number
                      </Button>
                      
                      <Button
                        onClick={() => pauseGame()}
                        className="w-full bg-orange-600 hover:bg-orange-700 py-2 text-xs"
                      >
                        ⏸️ Pause
                      </Button>
                    </>
                  )}
                  
                  {currentGame?.status === 'paused' && (
                    <Button
                      onClick={() => startGame()}
                      className="w-full bg-green-600 hover:bg-green-700 py-2 text-xs"
                    >
                      ▶️ Resume Game
                    </Button>
                  )}
                  
                  {currentGame && (
                    <>
                      <Button
                        onClick={async () => {
                          if (confirm('Reset game? This will clear all progress and create a new session.')) {
                            try {
                              // Clear current game data
                              await supabase.from('called_numbers').delete().eq('game_id', gameId)
                              await supabase.from('players').delete().eq('game_id', gameId)
                              
                              // Update game status to waiting for new session
                              await supabase.from('games').update({ 
                                status: 'waiting'
                              }).eq('id', gameId)
                              
                              // Reset local state
                              setPlayerName('')
                              setSelectedCard(null)
                              setPlayerCard(null)
                              setWinner(null)
                              setShowWinnerModal(false)
                              
                              if (callInterval) {
                                clearInterval(callInterval)
                                setAutoCall(false)
                              }
                              
                              alert('Game reset successfully! Ready for new session.')
                            } catch (error) {
                              console.error('Error resetting game:', error)
                              alert('Failed to reset game')
                            }
                          }
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 py-2 text-xs"
                      >
                        🔄 Reset Game
                      </Button>
                      
                      <Button
                        onClick={() => setShowWinnerCheck(true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 text-xs"
                      >
                        🏆 Check Winner
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Bottom Section */}
        {playerCard && (
          <div className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">🎯 Your Bingo Card</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerBingoCard 
                  cardNumber={selectedCard!}
                  calledNumbers={calledNumbers}
                  playerName={playerName}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Players List */}
        <Card className="mt-8 bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">👥 Players ({players.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {players.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {players.map((player) => (
                  <div key={player.id} className="bg-white/10 rounded-lg p-3 text-center hover:bg-white/20 transition-colors">
                    <div className="font-bold text-white text-sm truncate">{player.player_name}</div>
                    <div className="text-white/80 text-xs">#{player.selected_card_number}</div>
                    <div className="text-green-400 text-xs font-medium">20 ETB</div>
                    {player.is_winner && (
                      <div className="text-yellow-400 font-bold text-xs">🏆</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-white/60">No players yet. Use Assign Cards to add players!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        {showAssignCards && currentGame && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-center flex-1 text-white">🏏 Assign Bingo Card</h3>
                <button onClick={() => {
                  setShowAssignCards(false)
                  setPlayerName('')
                  setSelectedCard(null)
                }} className="text-white/70 hover:text-white text-2xl">✕</button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-white">Player Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter player name"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-white">Select Card Number (1-100)</label>
                <div className="flex gap-6">
                  <div className="grid grid-cols-10 gap-1 p-2 border rounded w-fit">
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(cardNum => {
                      const isTaken = players?.some(p => p.selected_card_number === cardNum) || false
                      const isSelected = selectedCard === cardNum
                      
                      return (
                        <button
                          key={cardNum}
                          onClick={() => !isTaken && setSelectedCard(cardNum)}
                          disabled={isTaken}
                          className={`w-8 h-6 text-xs font-bold border border-gray-300 rounded mx-1 transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-500 text-white border-blue-600'
                              : !isTaken
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-500 text-white cursor-not-allowed'
                          }`}
                        >
                          {cardNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  {selectedCard && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Card #{selectedCard} Preview</label>
                      <CardPreview cardNumber={selectedCard} />
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1 text-white">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    Available
                  </span>
                  <span className="flex items-center gap-1 text-white">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    Taken
                  </span>
                  <span className="flex items-center gap-1 text-white">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    Selected
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!playerName.trim() || !selectedCard) return

                    try {
                      const { data: player } = await supabase
                        .from('players')
                        .insert({
                          game_id: gameId,
                          player_name: playerName,
                          selected_card_number: selectedCard
                        })
                        .select()
                        .single()
                      
                      if (player) {
                        setPlayerName('')
                        setSelectedCard(null)
                        setShowAssignCards(false)
                        loadPlayers()
                      }
                    } catch (error: any) {
                      if (error?.code === '23505') {
                        alert('Card already assigned to another player')
                      } else {
                        alert('Failed to assign card')
                      }
                    }
                  }}
                  disabled={!playerName.trim() || !selectedCard}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💰 Assign Card (20 ETB - Manual Payment)
                </button>
                <button
                  onClick={() => {
                    setShowAssignCards(false)
                    setPlayerName('')
                    setSelectedCard(null)
                  }}
                  className="bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showWinnerCheck && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white/20 backdrop-blur-lg border-white/30">
              <CardHeader>
                <CardTitle className="text-white text-center">🏆 Check Winner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Enter Card Number (1-100)</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={winnerCardInput}
                    onChange={(e) => setWinnerCardInput(e.target.value)}
                    className="bg-white/10 border-white/30 text-white placeholder-white/50"
                    placeholder="Card number"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      const cardNum = parseInt(winnerCardInput)
                      if (cardNum >= 1 && cardNum <= 100) {
                        try {
                          const winners = await checkForWinners(gameId)
                          const winner = winners.find(w => w.player.selected_card_number === cardNum)
                          
                          if (winner) {
                            setWinner(winner)
                            setShowWinnerModal(true)
                            setShowWinnerCheck(false)
                            setWinnerCardInput('')
                          } else {
                            alert('No valid winning pattern found for this card')
                          }
                        } catch (error) {
                          alert('Error checking winner')
                        }
                      }
                    }}
                    disabled={!winnerCardInput}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    Check Winner
                  </Button>
                  <Button
                    onClick={() => {
                      setShowWinnerCheck(false)
                      setWinnerCardInput('')
                    }}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showWinnerModal && winner && (
          <WinnerModal
            winner={winner}
            totalPlayers={players.length}
            calledNumbers={calledNumbers}
            onClose={() => {
              setShowWinnerModal(false)
              setWinner(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function GamePage() {
  return <GameDetailPage />
}