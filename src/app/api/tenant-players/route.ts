import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const tenantId = searchParams.get('tenantId');

    if (!gameId || !tenantId) {
      return NextResponse.json({ error: 'Game ID and Tenant ID required' }, { status: 400 });
    }

    console.log('Fetching players for game:', gameId, 'tenant:', tenantId);

    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Found players:', players?.length || 0);
    return NextResponse.json({ players: players || [] });
  } catch (error) {
    console.error('GET /api/tenant-players error:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}