import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { number, admin_id } = await request.json();

    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', params.id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.admin_id !== admin_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedCalledNumbers = [...game.called_numbers, number];

    const { error: updateError } = await supabaseAdmin
      .from('games')
      .update({
        current_number: number,
        called_numbers: updatedCalledNumbers
      })
      .eq('id', params.id);

    if (updateError) throw updateError;

    const { error: recordError } = await supabaseAdmin
      .from('called_numbers')
      .insert({
        game_id: params.id,
        number
      });

    if (recordError) throw recordError;

    return NextResponse.json({ success: true, number });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to call number' }, { status: 500 });
  }
}