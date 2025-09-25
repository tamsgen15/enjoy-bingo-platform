import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get games data with error handling
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')

    if (gamesError) {
      console.error('Games query error:', gamesError)
    }

    // Get players data with error handling
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')

    if (playersError) {
      console.error('Players query error:', playersError)
    }

    // Calculate today's data
    const today = new Date().toISOString().split('T')[0]
    const todayGames = games?.filter((g: any) => g.created_at?.startsWith(today)) || []
    const todayPlayers = players?.filter((p: any) => p.created_at?.startsWith(today)) || []

    // Calculate revenue
    const entryFee = 20
    const totalRevenue = (players?.length || 0) * entryFee
    const todayRevenue = todayPlayers.length * entryFee
    const platformFeePercentage = 20
    const platformRevenue = Math.round(totalRevenue * (platformFeePercentage / 100))

    const stats = {
      totalGames: games?.length || 0,
      activeGames: games?.filter((g: any) => g.status === 'active').length || 0,
      totalPlayers: players?.length || 0,
      todayRevenue,
      totalRevenue,
      platformRevenue,
      todayGames: todayGames.length,
      todayPlayers: todayPlayers.length,
      averagePlayersPerGame: games?.length ? Math.round((players?.length || 0) / games.length) : 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching owner stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}