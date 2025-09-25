import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { gameId, cardNumber } = await request.json()

    if (!gameId || !cardNumber) {
      return NextResponse.json({ 
        error: 'Missing required parameters: gameId and cardNumber' 
      }, { status: 400 })
    }

    // Check if player exists in game
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('card_number', cardNumber)
      .single()

    if (playerError || !player) {
      return NextResponse.json({
        success: false,
        error: `Card #${cardNumber} is not registered in this game`
      })
    }

    // Get bingo card data
    const { data: cardData, error: cardError } = await supabase
      .from('bingo_cards')
      .select('*')
      .eq('card_number', cardNumber)
      .single()

    if (cardError || !cardData) {
      return NextResponse.json({
        success: false,
        error: 'Bingo card data not found'
      })
    }

    // Get called numbers
    const { data: calledNumbers } = await supabase
      .from('called_numbers')
      .select('number')
      .eq('game_id', gameId)
      .order('called_at', { ascending: true })

    const calledSet = new Set((calledNumbers || []).map(n => n.number))

    // Create grid from card data
    const grid = [
      cardData.b_column,
      cardData.i_column,
      [...cardData.n_column.slice(0, 2), 0, ...cardData.n_column.slice(2)], // FREE space as 0
      cardData.g_column,
      cardData.o_column
    ]

    // Check winning patterns
    let isWinner = false
    let winningPattern = null

    // Check horizontal lines
    for (let row = 0; row < 5; row++) {
      const rowComplete = grid.every((col: number[]) => col[row] === 0 || calledSet.has(col[row]))
      if (rowComplete) {
        isWinner = true
        winningPattern = {
          name: `${['Top', 'Second', 'Middle', 'Fourth', 'Bottom'][row]} Row`,
          description: `Complete ${['top', 'second', 'middle', 'fourth', 'bottom'][row]} horizontal line`,
          pattern_positions: Array.from({length: 5}, (_, i) => row * 5 + i)
        }
        break
      }
    }

    // Check vertical lines if no horizontal win
    if (!isWinner) {
      for (let col = 0; col < 5; col++) {
        const colComplete = grid[col].every((num: number) => num === 0 || calledSet.has(num))
        if (colComplete) {
          isWinner = true
          winningPattern = {
            name: `${['B', 'I', 'N', 'G', 'O'][col]} Column`,
            description: `Complete ${['B', 'I', 'N', 'G', 'O'][col]} column`,
            pattern_positions: Array.from({length: 5}, (_, i) => i * 5 + col)
          }
          break
        }
      }
    }

    // Check diagonals if no line win
    if (!isWinner) {
      const diagonal1 = [grid[0][0], grid[1][1], 0, grid[3][3], grid[4][4]]
      const diagonal2 = [grid[0][4], grid[1][3], 0, grid[3][1], grid[4][0]]

      if (diagonal1.every((num: number) => num === 0 || calledSet.has(num))) {
        isWinner = true
        winningPattern = {
          name: 'Main Diagonal',
          description: 'Top-left to bottom-right diagonal',
          pattern_positions: [0, 6, 12, 18, 24]
        }
      } else if (diagonal2.every((num: number) => num === 0 || calledSet.has(num))) {
        isWinner = true
        winningPattern = {
          name: 'Anti Diagonal',
          description: 'Top-right to bottom-left diagonal',
          pattern_positions: [4, 8, 12, 16, 20]
        }
      }
    }

    if (isWinner) {
      // Calculate prize
      const { count: playerCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId)
      
      const entryFee = 20
      const totalPot = (playerCount || 0) * entryFee
      const platformFee = totalPot * 0.20
      const prize = totalPot * 0.80
      
      // Mark player as winner
      await supabase
        .from('players')
        .update({ 
          is_winner: true,
          winning_pattern: winningPattern?.name || 'Unknown Pattern'
        })
        .eq('id', player.id)

      // Update game status to finished
      await supabase
        .from('games')
        .update({ 
          status: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', gameId)

      return NextResponse.json({
        success: true,
        isWinner: true,
        winner: {
          player: {
            id: player.id,
            player_name: player.player_name,
            card_number: cardNumber
          },
          pattern: winningPattern,
          prize,
          totalPot,
          platformFee,
          cardNumber,
          name: player.player_name,
          markedPositions: [12], // At least center is marked
          cardData: {
            b_column: cardData.b_column,
            i_column: cardData.i_column,
            n_column: cardData.n_column,
            g_column: cardData.g_column,
            o_column: cardData.o_column
          }
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        isWinner: false,
        player: {
          id: player.id,
          player_name: player.player_name,
          card_number: cardNumber
        },
        message: `Card #${cardNumber} (${player.player_name}) is not a winner`
      })
    }
  } catch (error) {
    console.error('Error in verify-winner API:', error)
    return NextResponse.json({ 
      error: 'Internal server error during winner verification' 
    }, { status: 500 })
  }
}