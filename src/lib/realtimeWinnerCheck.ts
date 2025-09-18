import { supabase } from './supabase'
import { checkForWinners, markNumber } from './bingoLogic'

export const setupRealtimeWinnerCheck = (gameId: string, onWinner: (winner: any) => void) => {
  // Subscribe to called numbers changes
  const subscription = supabase
    .channel(`game-${gameId}-numbers`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'called_numbers',
        filter: `game_id=eq.${gameId}`
      },
      async (payload: any) => {
        const calledNumber = payload.new.number
        
        // Mark number on all player cards
        const { data: players } = await supabase
          .from('players')
          .select('id')
          .eq('game_id', gameId)
          .eq('is_winner', false)
        
        if (players) {
          // Mark numbers on all cards
          for (const player of players) {
            await markNumber(player.id, calledNumber)
          }
          
          // Check for winners after a short delay
          setTimeout(async () => {
            const winners = await checkForWinners(gameId)
            if (winners.length > 0) {
              onWinner(winners[0])
              
              // Update game status to finished
              await supabase
                .from('games')
                .update({ status: 'finished' })
                .eq('id', gameId)
            }
          }, 1000)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(subscription)
  }
}

export const setupPlayerCardSubscription = (playerId: string, onCardUpdate: (card: any) => void) => {
  const subscription = supabase
    .channel(`player-${playerId}-card`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'player_cards',
        filter: `player_id=eq.${playerId}`
      },
      (payload: any) => {
        onCardUpdate(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(subscription)
  }
}