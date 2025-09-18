import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { admin_id } = await request.json();

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!game || game.admin_id !== admin_id || game.status !== 'active') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const calledNumbers = game.called_numbers || [];
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(num => !calledNumbers.includes(num));

    if (availableNumbers.length === 0) {
      return NextResponse.json({ error: 'All numbers called' }, { status: 400 });
    }

    const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    const updatedCalledNumbers = [...calledNumbers, nextNumber];

    await supabaseAdmin
      .from('games')
      .update({
        current_number: nextNumber,
        called_numbers: updatedCalledNumbers
      })
      .eq('id', params.id);

    await supabaseAdmin
      .from('called_numbers')
      .insert({
        game_id: params.id,
        number: nextNumber
      });

    return NextResponse.json({ number: nextNumber });
  } catch (error) {
    console.error('Auto call error');
    return NextResponse.json({ error: 'Failed to call number' }, { status: 500 });
  }
}