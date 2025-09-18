import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { player_id, admin_id } = await request.json();

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('*, players(*)')
      .eq('id', params.id)
      .single();

    if (!game || game.admin_id !== admin_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const player = game.players.find((p: any) => p.id === player_id);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get player's printed card
    const { data: card } = await supabaseAdmin
      .from('printed_cards')
      .select('*')
      .eq('card_number', player.selected_card_number)
      .single();

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Check if player has winning pattern
    const calledNumbers = game.called_numbers || [];
    const cardNumbers = [
      ...card.b_column,
      ...card.i_column,
      ...card.n_column,
      ...card.g_column,
      ...card.o_column
    ];

    // Check for line wins (rows, columns, diagonals)
    const isWinner = checkWinningPattern(card, calledNumbers);

    if (isWinner) {
      // Calculate prize (total bets - 20% platform fee)
      const totalBets = game.players.reduce((sum: number, p: any) => sum + (p.bet_amount || 0), 0);
      const platformFee = totalBets * 0.20;
      const winnerPrize = totalBets - platformFee;

      // Update player as winner and game as finished
      await supabaseAdmin
        .from('players')
        .update({ is_winner: true })
        .eq('id', player_id);

      await supabaseAdmin
        .from('games')
        .update({ 
          status: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', params.id);

      return NextResponse.json({ 
        isWinner: true, 
        prize: winnerPrize,
        platformFee,
        totalBets
      });
    }

    return NextResponse.json({ isWinner: false });
  } catch (error) {
    console.error('Verification error');
    return NextResponse.json({ error: 'Failed to verify winner' }, { status: 500 });
  }
}

function checkWinningPattern(card: any, calledNumbers: number[]): boolean {
  const grid = [
    card.b_column,
    card.i_column,
    [...card.n_column.slice(0, 2), 0, ...card.n_column.slice(2)], // Add FREE space
    card.g_column,
    card.o_column
  ];

  // Check rows
  for (let row = 0; row < 5; row++) {
    let rowWin = true;
    for (let col = 0; col < 5; col++) {
      const num = grid[col][row];
      if (num !== 0 && !calledNumbers.includes(num)) {
        rowWin = false;
        break;
      }
    }
    if (rowWin) return true;
  }

  // Check columns
  for (let col = 0; col < 5; col++) {
    let colWin = true;
    for (let row = 0; row < 5; row++) {
      const num = grid[col][row];
      if (num !== 0 && !calledNumbers.includes(num)) {
        colWin = false;
        break;
      }
    }
    if (colWin) return true;
  }

  // Check diagonals
  let diag1Win = true, diag2Win = true;
  for (let i = 0; i < 5; i++) {
    const num1 = grid[i][i];
    const num2 = grid[i][4 - i];
    
    if (num1 !== 0 && !calledNumbers.includes(num1)) diag1Win = false;
    if (num2 !== 0 && !calledNumbers.includes(num2)) diag2Win = false;
  }

  return diag1Win || diag2Win;
}