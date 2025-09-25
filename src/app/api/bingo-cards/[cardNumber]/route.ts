import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { cardNumber: string } }
) {
  try {
    const cardNumber = parseInt(params.cardNumber);
    
    if (isNaN(cardNumber) || cardNumber < 1 || cardNumber > 100) {
      return NextResponse.json({ error: 'Invalid card number' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('bingo_cards')
      .select('*')
      .eq('card_number', cardNumber)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/bingo-cards/[cardNumber] error:', error);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}