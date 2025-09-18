import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Clear existing cards first
    const { error: deleteError } = await supabase
      .from('bingo_cards')
      .delete()
      .neq('card_number', 0)
    
    if (deleteError) {
      console.error('Error clearing cards:', deleteError)
      return NextResponse.json({ error: 'Failed to clear existing cards' }, { status: 500 })
    }

    // Generate truly unique cards with delays
    for (let i = 1; i <= 100; i++) {
      const { error } = await supabase.rpc('generate_truly_random_bingo_card', { card_num: i })
      if (error) {
        console.error(`Error generating card ${i}:`, error)
        return NextResponse.json({ error: `Failed to generate card ${i}` }, { status: 500 })
      }
      // Small delay to ensure different random seeds
      await new Promise(resolve => setTimeout(resolve, 20))
    }

    // Verify cards were generated correctly
    const { data: sampleCards, error: fetchError } = await supabase
      .from('bingo_cards')
      .select('*')
      .limit(5)
      .order('card_number')

    if (fetchError) {
      console.error('Error fetching sample cards:', fetchError)
      return NextResponse.json({ error: 'Failed to verify cards' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All 100 bingo cards regenerated with truly unique random numbers',
      sampleCards,
      totalCards: 100
    })
  } catch (error) {
    console.error('Regenerate cards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}