import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { gameId, action, tenantId } = await request.json()

    if (!gameId) {
      return NextResponse.json({ success: false, error: 'Game ID required' })
    }

    switch (action) {
      case 'call_number':
        const { data: callResult, error: callError } = await supabase.rpc('call_next_number_realtime', {
          game_uuid: gameId,
          p_tenant_id: tenantId || null
        })

        if (callError) {
          return NextResponse.json({ success: false, error: callError.message })
        }

        return NextResponse.json(callResult)

      case 'get_status':
        const { data: statusResult, error: statusError } = await supabase.rpc('get_realtime_game_status', {
          game_uuid: gameId,
          p_tenant_id: tenantId || null
        })

        if (statusError) {
          return NextResponse.json({ success: false, error: statusError.message })
        }

        return NextResponse.json(statusResult)

      case 'reset_game':
        const { data: resetResult, error: resetError } = await supabase.rpc('reset_game_realtime', {
          game_uuid: gameId,
          p_tenant_id: tenantId || null
        })

        if (resetError) {
          return NextResponse.json({ success: false, error: resetError.message })
        }

        return NextResponse.json(resetResult)

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Real-time API error:', error)
    return NextResponse.json({ success: false, error: 'Server error' })
  }
}