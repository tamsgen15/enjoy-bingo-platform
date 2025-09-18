'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/UnifiedAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NumberBoard from '@/components/NumberBoard'
import WinnerModal from '@/components/WinnerModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import { OfflineAmharicTTS } from '@/lib/OfflineAmharicTTS'

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

  if (!cardData) return <div className="text-white text-xs">Loading...</div>

  return (
    <div className="border rounded p-2 bg-gray-50 w-fit">
      <div className="grid grid-cols-5 gap-0.5 text-xs">
        <div className="font-bold text-center bg-sky-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">B</div>
        <div className="font-bold text-center bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">I</div>
        <div className="font-bold text-center bg-yellow-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">N</div>
        <div className="font-bold text-center bg-green-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">G</div>
        <div className="font-bold text-center bg-orange-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">O</div>
        
        {[0,1,2,3,4].map(row => 
          [cardData.b[row], cardData.i[row], cardData.n[row], cardData.g[row], cardData.o[row]].map((num, col) => (
            <div key={`${row}-${col}`} className={`text-center w-4 h-4 border flex items-center justify-center text-xs ${
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

function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  
  const [currentGame, setCurrentGame] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [calledNumbers, setCalledNumbers] = useState<number[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null)
  
  const [showCardSelection, setShowCardSelection] = useState(false)
  const [winnerCardNumber, setWinnerCardNumber] = useState('')
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [winner, setWinner] = useState<any>(null)
  const [playerName, setPlayerName] = useState('')
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [voiceTTS] = useState(() => new OfflineAmharicTTS())

  // Real-time subscriptions for all components
  useEffect(() => {
    const gamesSubscription = supabase
      .channel('admin_games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new?.id === currentGame?.id) {
          setCurrentGame(payload.new)
        } else if (payload.eventType === 'DELETE' && payload.old?.id === currentGame?.id) {
          setCurrentGame(null)
          setPlayers([])
          setCalledNumbers([])
          setCurrentNumber(null)
        } else {
          loadCurrentGame()
        }
      })
      .subscribe()

    const playersSubscription = supabase
      .channel('admin_players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new?.game_id === currentGame?.id) {
          setPlayers(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE' && payload.new?.game_id === currentGame?.id) {
          setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
        } else if (payload.eventType === 'DELETE' && payload.old?.game_id === currentGame?.id) {
          setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
        }
      })
      .subscribe()

    const calledNumbersSubscription = supabase
      .channel('admin_called_numbers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'called_numbers' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.game_id === currentGame?.id) {
          setCalledNumbers(prev => {
            if (!prev.includes(payload.new.number)) {
              const newNumbers = [...prev, payload.new.number]
              setCurrentNumber(payload.new.number)
              
              // Announce the number with voice
              const letter = payload.new.number <= 15 ? 'B' : 
                           payload.new.number <= 30 ? 'I' : 
                           payload.new.number <= 45 ? 'N' : 
                           payload.new.number <= 60 ? 'G' : 'O'
              setTimeout(() => {
                voiceTTS.speak(`${letter} ${payload.new.number}`)
              }, 500)
              
              setTimeout(() => checkForWinners(), 1000)
              return newNumbers
            }
            return prev
          })
        } else if (payload.eventType === 'DELETE' && payload.old?.game_id === currentGame?.id) {
          loadCalledNumbers()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gamesSubscription)
      supabase.removeChannel(playersSubscription)
      supabase.removeChannel(calledNumbersSubscription)
    }
  }, [currentGame?.id])

  // Auto number calling
  useEffect(() => {
    if (currentGame?.status === 'active' && calledNumbers.length < 75) {
      const interval = setInterval(async () => {
        await callNextNumber()
      }, 5000)
      setAutoCallInterval(interval)
      return () => clearInterval(interval)
    } else if (autoCallInterval) {
      clearInterval(autoCallInterval)
      setAutoCallInterval(null)
    }
  }, [currentGame?.status, calledNumbers.length])

  const loadCurrentGame = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) {
        console.error('Database error loading game:', error)
        return
      }
      
      if (data && data.length > 0) {
        const game = data[0]
        setCurrentGame(game)
        await Promise.all([
          loadPlayers(game.id),
          loadCalledNumbers(game.id)
        ])
      } else {
        setCurrentGame(null)
        setPlayers([])
        setCalledNumbers([])
        setCurrentNumber(null)
      }
    } catch (error) {
      console.error('Error loading game:', error)
    }
  }

  const loadPlayers = async (gameId = currentGame?.id) => {
    if (!gameId) return
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
      
      if (error) {
        console.error('Database error loading players:', error)
        return
      }
      
      setPlayers(data || [])
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }

  const loadCalledNumbers = async (gameId = currentGame?.id) => {
    if (!gameId) return
    try {
      const { data, error } = await supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', gameId)
        .order('called_at', { ascending: true })
      
      if (error) {
        console.error('Database error loading called numbers:', error)
        return
      }
      
      const numbers = data?.map(item => item.number) || []
      setCalledNumbers(numbers)
      if (numbers.length > 0) {
        setCurrentNumber(numbers[numbers.length - 1])
      } else {
        setCurrentNumber(null)
      }
    } catch (error) {
      console.error('Error loading called numbers:', error)
    }
  }

  const createGame = async () => {
    try {
      // End any existing unfinished games first
      const { error: updateError } = await supabase
        .from('games')
        .update({ 
          status: 'finished', 
          finished_at: new Date().toISOString() 
        })
        .neq('status', 'finished')
      
      if (updateError) {
        console.error('Error ending existing games:', updateError)
      }
      
      const { data, error } = await supabase
        .from('games')
        .insert([{ 
          status: 'waiting',
          admin_id: user?.id || crypto.randomUUID()
        }])
        .select()
      
      if (error) {
        console.error('Database error creating game:', error)
        alert('Failed to create game: ' + error.message)
        return
      }
      
      if (data && data.length > 0) {
        const newGame = data[0]
        setCurrentGame(newGame)
        setPlayers([])
        setCalledNumbers([])
        setCurrentNumber(null)
        if (autoCallInterval) {
          clearInterval(autoCallInterval)
          setAutoCallInterval(null)
        }
      }
    } catch (error) {
      console.error('Error creating game:', error)
      alert('Failed to create game')
    }
  }

  const startGame = async () => {
    if (!currentGame) return
    try {
      const { error } = await supabase
        .from('games')
        .update({ 
          status: 'active', 
          started_at: new Date().toISOString() 
        })
        .eq('id', currentGame.id)
      
      if (error) {
        console.error('Database error starting game:', error)
        alert('Failed to start game: ' + error.message)
      } else {
        // Announce game start
        setTimeout(() => {
          voiceTTS.speak('Game Started')
        }, 1000)
      }
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Failed to start game')
    }
  }

  const pauseGame = async () => {
    if (!currentGame) return
    try {
      const { error } = await supabase
        .from('games')
        .update({ status: 'paused' })
        .eq('id', currentGame.id)
      
      if (error) {
        console.error('Database error pausing game:', error)
        alert('Failed to pause game: ' + error.message)
      }
    } catch (error) {
      console.error('Error pausing game:', error)
      alert('Failed to pause game')
    }
  }

  const callNextNumber = async () => {
    if (!currentGame || calledNumbers.length >= 75 || currentGame.status !== 'active') return
    
    try {
      // Get fresh data from database to ensure accuracy
      const { data: existingNumbers, error: fetchError } = await supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', currentGame.id)
      
      if (fetchError) {
        console.error('Error fetching existing numbers:', fetchError)
        return
      }
      
      const existing = existingNumbers?.map(item => item.number) || []
      const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
        .filter(num => !existing.includes(num))
      
      if (availableNumbers.length > 0) {
        const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)]
        
        const { error } = await supabase
          .from('called_numbers')
          .insert([{ 
            game_id: currentGame.id, 
            number: nextNumber
          }])
        
        if (error) {
          console.error('Database error calling number:', error)
          alert('Failed to call number: ' + error.message)
        } else {
          // Announce the number immediately after successful insert
          const letter = nextNumber <= 15 ? 'B' : 
                        nextNumber <= 30 ? 'I' : 
                        nextNumber <= 45 ? 'N' : 
                        nextNumber <= 60 ? 'G' : 'O'
          setTimeout(() => {
            voiceTTS.speak(`${letter} ${nextNumber}`)
          }, 500)
        }
      }
    } catch (error) {
      console.error('Error calling number:', error)
      alert('Failed to call number')
    }
  }

  const checkForWinners = async () => {
    if (!currentGame || calledNumbers.length < 5) return
    
    try {
      // Get fresh data from database
      const { data: currentPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', currentGame.id)
        .eq('is_winner', false)
      
      const { data: currentNumbers } = await supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', currentGame.id)
        .order('called_at', { ascending: true })
      
      const numbers = currentNumbers?.map(item => item.number) || []
      
      for (const player of currentPlayers || []) {
        const { data: card } = await supabase
          .from('bingo_cards')
          .select('*')
          .eq('card_number', player.selected_card_number)
          .single()
        
        if (card && hasWinningPattern(card, numbers)) {
          const entryFee = 20
          const totalPot = (currentPlayers?.length || 0) * entryFee
          const platformFee = totalPot * 0.20
          const prize = totalPot - platformFee
          
          // Update winner in database
          await supabase
            .from('players')
            .update({ 
              is_winner: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', player.id)
          
          // End game
          await supabase
            .from('games')
            .update({ 
              status: 'finished', 
              finished_at: new Date().toISOString(),
              winner_player_id: player.id
            })
            .eq('id', currentGame.id)
          
          setWinner({ player, prize, totalPot, platformFee })
          setShowWinnerModal(true)
          
          // Stop auto calling
          if (autoCallInterval) {
            clearInterval(autoCallInterval)
            setAutoCallInterval(null)
          }
          return
        }
      }
    } catch (error) {
      console.error('Error checking winners:', error)
    }
  }

  const hasWinningPattern = (card: any, called: number[]) => {
    const calledSet = new Set(called)
    const grid = [
      card.b_column,
      card.i_column,
      [...card.n_column.slice(0, 2), 'FREE', ...card.n_column.slice(2)],
      card.g_column,
      card.o_column
    ]
    
    // Check horizontal lines
    for (let row = 0; row < 5; row++) {
      if (grid.every(col => col[row] === 'FREE' || calledSet.has(col[row]))) return true
    }
    
    // Check vertical lines
    for (let col = 0; col < 5; col++) {
      if (grid[col].every((num: any) => num === 'FREE' || calledSet.has(num))) return true
    }
    
    // Check diagonals
    const diagonal1 = [grid[0][0], grid[1][1], 'FREE', grid[3][3], grid[4][4]]
    const diagonal2 = [grid[0][4], grid[1][3], 'FREE', grid[3][1], grid[4][0]]
    
    if (diagonal1.every(num => num === 'FREE' || calledSet.has(num))) return true
    if (diagonal2.every(num => num === 'FREE' || calledSet.has(num))) return true
    
    return false
  }

  const handleVerifyWinner = async () => {
    if (!winnerCardNumber || !currentGame) return
    
    try {
      // Get game rules from database
      const { data: gameRules } = await supabase
        .from('game_rules')
        .select('*')
        .eq('id', currentGame.rule_id || 1)
        .single()
      
      // Get player data
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', currentGame.id)
        .eq('selected_card_number', parseInt(winnerCardNumber))
        .single()
      
      if (!player) {
        alert('No player found with that card number')
        return
      }
      
      // Get actual bingo card from database
      const { data: card } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('card_number', parseInt(winnerCardNumber))
        .single()
      
      if (!card) {
        alert('Bingo card not found in database')
        return
      }
      
      // Get called numbers from database
      const { data: calledNumbersData } = await supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', currentGame.id)
        .order('called_at', { ascending: true })
      
      const calledNumbers = calledNumbersData?.map(item => item.number) || []
      
      // Create bingo card grid with actual database data
      const cardGrid = [
        card.b_column,
        card.i_column, 
        [...card.n_column.slice(0, 2), 'FREE', ...card.n_column.slice(2)],
        card.g_column,
        card.o_column
      ]
      
      // Check winning patterns based on database rules
      const winningPatterns = gameRules?.winning_patterns || ['line', 'full_house']
      const calledSet = new Set(calledNumbers)
      let hasWin = false
      let winPattern = null
      
      // Check for line patterns (horizontal, vertical, diagonal)
      if (winningPatterns.includes('line')) {
        // Horizontal lines
        for (let row = 0; row < 5; row++) {
          if (cardGrid.every(col => col[row] === 'FREE' || calledSet.has(col[row]))) {
            hasWin = true
            winPattern = { type: 'horizontal', line: row }
            break
          }
        }
        
        // Vertical lines
        if (!hasWin) {
          for (let col = 0; col < 5; col++) {
            if (cardGrid[col].every((num: any) => num === 'FREE' || calledSet.has(num))) {
              hasWin = true
              winPattern = { type: 'vertical', line: col }
              break
            }
          }
        }
        
        // Diagonal lines
        if (!hasWin) {
          const diagonal1 = [cardGrid[0][0], cardGrid[1][1], 'FREE', cardGrid[3][3], cardGrid[4][4]]
          const diagonal2 = [cardGrid[0][4], cardGrid[1][3], 'FREE', cardGrid[3][1], cardGrid[4][0]]
          
          if (diagonal1.every(num => num === 'FREE' || calledSet.has(num))) {
            hasWin = true
            winPattern = { type: 'diagonal', line: 'main' }
          } else if (diagonal2.every(num => num === 'FREE' || calledSet.has(num))) {
            hasWin = true
            winPattern = { type: 'diagonal', line: 'anti' }
          }
        }
      }
      
      // Check for full house
      if (!hasWin && winningPatterns.includes('full_house')) {
        const allNumbers = cardGrid.flat().filter(num => num !== 'FREE')
        if (allNumbers.every(num => calledSet.has(num))) {
          hasWin = true
          winPattern = { type: 'full_house' }
        }
      }
      
      if (hasWin) {
        const entryFee = gameRules?.card_price || 20
        const { data: allPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', currentGame.id)
        
        const totalPot = (allPlayers?.length || 0) * entryFee
        const platformFee = totalPot * 0.20
        const prize = totalPot - platformFee
        
        // Update winner in database
        await supabase
          .from('players')
          .update({ is_winner: true })
          .eq('id', player.id)
        
        // End game
        await supabase
          .from('games')
          .update({ 
            status: 'finished', 
            finished_at: new Date().toISOString(),
            winner_player_id: player.id
          })
          .eq('id', currentGame.id)
        
        setWinner({ 
          player, 
          prize, 
          totalPot, 
          platformFee, 
          card: cardGrid,
          calledNumbers,
          winningPattern: winPattern
        })
        setShowWinnerModal(true)
        setWinnerCardNumber('')
        
        if (autoCallInterval) {
          clearInterval(autoCallInterval)
          setAutoCallInterval(null)
        }
      } else {
        alert(`No valid winning pattern found for card #${winnerCardNumber}. Required patterns: ${winningPatterns.join(', ')}`)
      }
    } catch (error) {
      console.error('Error verifying winner:', error)
      alert('Failed to verify winner: ' + error.message)
    }
  }
  
  const getWinningPattern = (card: any, called: number[]) => {
    const calledSet = new Set(called)
    const grid = [
      card.b_column,
      card.i_column,
      [...card.n_column.slice(0, 2), 'FREE', ...card.n_column.slice(2)],
      card.g_column,
      card.o_column
    ]
    
    // Check horizontal lines
    for (let row = 0; row < 5; row++) {
      if (grid.every(col => col[row] === 'FREE' || calledSet.has(col[row]))) {
        return { type: 'horizontal', line: row }
      }
    }
    
    // Check vertical lines
    for (let col = 0; col < 5; col++) {
      if (grid[col].every((num: any) => num === 'FREE' || calledSet.has(num))) {
        return { type: 'vertical', line: col }
      }
    }
    
    // Check diagonals
    const diagonal1 = [grid[0][0], grid[1][1], 'FREE', grid[3][3], grid[4][4]]
    const diagonal2 = [grid[0][4], grid[1][3], 'FREE', grid[3][1], grid[4][0]]
    
    if (diagonal1.every(num => num === 'FREE' || calledSet.has(num))) {
      return { type: 'diagonal', line: 'main' }
    }
    if (diagonal2.every(num => num === 'FREE' || calledSet.has(num))) {
      return { type: 'diagonal', line: 'anti' }
    }
    
    return null
  }

  const assignCard = async () => {
    if (!playerName.trim() || !selectedCard || !currentGame) return
    
    try {
      // Check if card is already taken (fresh from database)
      const { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('game_id', currentGame.id)
        .eq('selected_card_number', selectedCard)
        .maybeSingle()
      
      if (checkError) {
        console.error('Error checking existing player:', checkError)
        alert('Failed to verify card availability')
        return
      }
      
      if (existingPlayer) {
        alert('Card already assigned to another player')
        return
      }
      
      // Verify card exists in bingo_cards table
      const { data: cardExists, error: cardError } = await supabase
        .from('bingo_cards')
        .select('card_number')
        .eq('card_number', selectedCard)
        .maybeSingle()
      
      if (cardError) {
        console.error('Error checking card:', cardError)
        alert('Failed to verify card')
        return
      }
      
      if (!cardExists) {
        alert('Invalid card number')
        return
      }
      
      const { error } = await supabase
        .from('players')
        .insert([{
          game_id: currentGame.id,
          player_name: playerName.trim(),
          selected_card_number: selectedCard,
          is_winner: false
        }])
      
      if (error) {
        console.error('Database error:', error)
        alert('Failed to assign card: ' + error.message)
        return
      }
      
      setPlayerName('')
      setSelectedCard(null)
      setShowCardSelection(false)
    } catch (error) {
      console.error('Error assigning card:', error)
      alert('Failed to assign card')
    }
  }

  useEffect(() => {
    loadCurrentGame()
  }, [])

  const totalPot = players.length * 20
  const platformFee = totalPot * 0.20
  const winnerPrize = totalPot - platformFee

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Enjoy Bingo" className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              Enjoy Bingo
            </h1>
            <p className="text-white/70 mt-1">🔴 Admin Control Panel - Welcome, {user?.username}</p>
          </div>
        </div>
        <div className="hidden md:flex gap-3">
          <Button 
            onClick={() => router.push('/game')} 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10"
          >
            🎮 Games
          </Button>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Sidebar - Game Status */}
        <div className="lg:col-span-3">
          {currentGame && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">🎯 Game Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-white/70 text-xs mb-1">Status</div>
                    <div className={`font-bold text-sm ${
                      currentGame.status === 'active' ? 'text-green-400' :
                      currentGame.status === 'waiting' ? 'text-yellow-400' :
                      currentGame.status === 'paused' ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                      {currentGame.status?.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-1">Players</div>
                    <div className="text-white font-bold text-sm">{players.length}</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-1">Numbers Called</div>
                    <div className="text-white font-bold text-sm">{calledNumbers.length}/75</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-1">Total Pot</div>
                    <div className="text-blue-400 font-bold text-sm">{totalPot} ETB</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-white/70 text-xs mb-1">Winner Prize</div>
                    <div className="text-yellow-400 font-bold text-sm">{winnerPrize} ETB</div>
                  </div>
                  {currentNumber && (
                    <div className="col-span-2 text-center mt-4">
                      <div className="text-white/70 text-sm mb-2">Current Number</div>
                      <div className="text-white font-bold text-6xl">
                        {currentNumber <= 15 ? 'B' : 
                         currentNumber <= 30 ? 'I' : 
                         currentNumber <= 45 ? 'N' : 
                         currentNumber <= 60 ? 'G' : 'O'}{currentNumber}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Center - Number Board */}
        <div className="lg:col-span-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center text-2xl">📋 BINGO NUMBER BOARD</CardTitle>
            </CardHeader>
            <CardContent>
              <NumberBoard 
                calledNumbers={calledNumbers}
                currentNumber={currentNumber}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Sidebar - Game Controls */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">🎮 Game Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {!currentGame ? (
                  <Button 
                    onClick={createGame}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    🎲 Create New Game
                  </Button>
                ) : (
                  <>
                    {currentGame.status === 'waiting' && (
                      <Button
                        onClick={() => setShowCardSelection(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                      >
                        🏏 Assign Player Cards
                      </Button>
                    )}
                    
                    {currentGame.status === 'waiting' ? (
                      <Button
                        onClick={startGame}
                        disabled={players.length < 1}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3"
                      >
                        🚀 Start Game ({players.length} players)
                      </Button>
                    ) : currentGame.status === 'active' ? (
                      <Button
                        onClick={pauseGame}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                      >
                        ⏸️ Pause Game
                      </Button>
                    ) : (
                      <Button
                        onClick={startGame}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                      >
                        ▶️ Resume Game
                      </Button>
                    )}
                    
                    <Button
                      onClick={callNextNumber}
                      disabled={calledNumbers.length >= 75 || currentGame.status !== 'active'}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3"
                    >
                      🎲 Call Next Number
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        if (confirm('End this game? This will reset everything and create a new session.')) {
                          await supabase.from('called_numbers').delete().eq('game_id', currentGame.id)
                          await supabase.from('players').delete().eq('game_id', currentGame.id)
                          await supabase.from('games').delete().eq('id', currentGame.id)
                          
                          setCurrentGame(null)
                          setPlayers([])
                          setCalledNumbers([])
                          setCurrentNumber(null)
                          if (autoCallInterval) {
                            clearInterval(autoCallInterval)
                            setAutoCallInterval(null)
                          }
                        }
                      }}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3"
                    >
                      🏁 End & Reset Game
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">🏆 Winner Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cardNumber" className="text-white mb-2 block">Card Number (1-100)</Label>
                <Input
                  id="cardNumber"
                  type="number"
                  min="1"
                  max="100"
                  value={winnerCardNumber}
                  onChange={(e) => setWinnerCardNumber(e.target.value)}
                  placeholder="Enter winning card number"
                  className="bg-white/20 border-white/30 text-white placeholder-white/50"
                />
              </div>
              <Button
                onClick={handleVerifyWinner}
                disabled={!winnerCardNumber || !currentGame}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              >
                ✓ Verify Winner
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Players List */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">👥 Active Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {players.map((player) => (
                <div key={player.id} className="bg-white/10 rounded-lg p-3 border border-white/20 text-center">
                  <div className="font-medium text-white text-sm truncate">{player.player_name}</div>
                  <div className="text-white/80 text-xs">#{player.selected_card_number}</div>
                  <div className="text-green-400 text-xs font-medium">20 ETB</div>
                  {player.is_winner && (
                    <div className="text-yellow-400 text-xs font-bold">🏆</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-white/60">No players in current game</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Selection Modal */}
      {showCardSelection && currentGame && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl bg-white/20 backdrop-blur-lg border-white/30">
            <CardHeader>
              <CardTitle className="text-white text-center">🏏 Assign Bingo Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Player Name</Label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-white/10 border-white/30 text-white placeholder-white/50"
                  placeholder="Enter player name"
                />
              </div>
              
              <div>
                <Label className="text-white mb-2 block">Select Card Number (1-100)</Label>
                <div className="flex gap-6">
                  {selectedCard && (
                    <div className="flex-shrink-0">
                      <div className="text-white text-sm mb-2">Card #{selectedCard} Preview</div>
                      <CardPreview cardNumber={selectedCard} />
                    </div>
                  )}
                  <div className="grid grid-cols-10 gap-0.5 p-4 border rounded flex-1">
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(cardNum => {
                      const isTaken = players.some(p => p.selected_card_number === cardNum)
                      const isSelected = selectedCard === cardNum
                      
                      return (
                        <button
                          key={cardNum}
                          onClick={() => !isTaken && setSelectedCard(cardNum)}
                          disabled={isTaken}
                          className={`w-6 h-6 text-xs font-bold border rounded transition-all ${
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
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={assignCard}
                  disabled={!playerName.trim() || !selectedCard}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  💰 Assign Card (20 ETB)
                </Button>
                <Button
                  onClick={() => {
                    setShowCardSelection(false)
                    setPlayerName('')
                    setSelectedCard(null)
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
          onClose={async () => {
            setShowWinnerModal(false)
            setWinner(null)
            
            // End and reset current game
            if (currentGame) {
              await supabase.from('called_numbers').delete().eq('game_id', currentGame.id)
              await supabase.from('players').delete().eq('game_id', currentGame.id)
              await supabase.from('games').delete().eq('id', currentGame.id)
              
              setCurrentGame(null)
              setPlayers([])
              setCalledNumbers([])
              setCurrentNumber(null)
              if (autoCallInterval) {
                clearInterval(autoCallInterval)
                setAutoCallInterval(null)
              }
            }
          }}
        />
      )}
    </div>
  )
}

export default function AdminPage() {
  return <AdminDashboard />
}