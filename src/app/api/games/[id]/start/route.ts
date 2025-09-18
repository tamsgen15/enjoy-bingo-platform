import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gameId = params.id

  try {
    // Get game rules
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('*, game_rules(*)')
      .eq('id', gameId)
      .single()

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Generate random number sequence
    const numbers = Array.from({ length: 75 }, (_, i) => i + 1)
    const shuffled = numbers.sort(() => Math.random() - 0.5)

    // Start calling numbers
    let currentIndex = 0
    const interval = setInterval(async () => {
      if (currentIndex >= shuffled.length) {
        clearInterval(interval)
        
        // End game
        await supabaseAdmin
          .from('games')
          .update({ 
            status: 'finished',
            finished_at: new Date().toISOString()
          })
          .eq('id', gameId)
        
        return
      }

      const number = shuffled[currentIndex]
      
      // Update game with current number
      await supabaseAdmin
        .from('games')
        .update({ 
          current_number: number,
          called_numbers: [...(game.called_numbers || []), number]
        })
        .eq('id', gameId)

      // Record called number
      await supabaseAdmin
        .from('called_numbers')
        .insert({
          game_id: gameId,
          number: number
        })

      currentIndex++
    }, game.game_rules?.number_call_interval || 3000)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error starting game')
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }
}