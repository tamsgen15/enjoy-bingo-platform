import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        players (
          id,
          player_name,
          selected_card_number,
          is_winner
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        status: 'waiting'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ game });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}