import { NextRequest, NextResponse } from 'next/server';

// This endpoint is disabled to prevent conflicts with automatic number calling
// All number calling is now handled by the AutomaticNumberCaller system

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ 
    error: 'Manual number calling disabled. Numbers are called automatically when game is active.',
    message: 'Use the automatic number calling system instead'
  }, { status: 400 });
}