import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { RealtimeWinnerService } from '@/lib/realtimeWinnerService';

export async function POST(request: NextRequest) {
  try {
    const { gameId, tenantId, cardNumber } = await request.json();

    if (!gameId || !cardNumber) {
      return NextResponse.json({ error: 'Missing required parameters: gameId and cardNumber' }, { status: 400 });
    }

    // Use the new real-time winner service for verification
    const result = await RealtimeWinnerService.verifyWinnerManually(gameId, cardNumber);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('POST /api/validate-winner error:', error);
    return NextResponse.json({ error: 'Failed to validate winner' }, { status: 500 });
  }
}