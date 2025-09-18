import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { player_name, selected_card_number, bet_amount } = await request.json();

    // Check if card number is already taken
    const { data: existingPlayer } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('game_id', params.id)
      .eq('selected_card_number', selected_card_number)
      .single();

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Card number already selected' },
        { status: 400 }
      );
    }

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .insert({
        game_id: params.id,
        player_name,
        selected_card_number,
        bet_amount
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ player });
  } catch (error) {
    console.error('Join game error');
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}