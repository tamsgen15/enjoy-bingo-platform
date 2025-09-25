import { supabase } from './supabase'
import { WinningVerificationService } from './winningVerificationService'

export class RealtimeWinnerService {
  private static subscriptions: Map<string, any> = new Map()
  private static winnerCallbacks: Map<string, (winner: any) => void> = new Map()

  // Setup real-time winner checking for a game
  static setupWinnerMonitoring(gameId: string, onWinner: (winner: any) => void) {
    // Store callback
    this.winnerCallbacks.set(gameId, onWinner)

    // Subscribe to called numbers for auto-marking and winner checking
    const calledNumbersSubscription = supabase
      .channel(`game-${gameId}-called-numbers`)
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
          console.log(`🎯 Number ${calledNumber} called in game ${gameId}`)
          
          // Auto-mark will be handled by database trigger
          // Check for winners after a short delay to allow auto-marking to complete
          setTimeout(async () => {
            await this.checkForWinners(gameId)
          }, 500)
        }
      )
      .subscribe()

    // Subscribe to player marked numbers changes for manual marking
    const markedNumbersSubscription = supabase
      .channel(`game-${gameId}-marked-numbers`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'player_marked_numbers',
          filter: `game_id=eq.${gameId}`
        },
        async (payload: any) => {
          console.log(`📍 Player marked numbers updated in game ${gameId}`)
          
          // Check for winners when player manually marks numbers
          setTimeout(async () => {
            await this.checkForWinners(gameId)
          }, 100)
        }
      )
      .subscribe()

    // Subscribe to players table for winner updates
    const playersSubscription = supabase
      .channel(`game-${gameId}-players`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`
        },
        async (payload: any) => {
          if (payload.new.is_winner && !payload.old.is_winner) {
            console.log(`🏆 Winner detected in game ${gameId}:`, payload.new.player_name)
            
            // Get full winner details
            const winnerDetails = await this.getWinnerDetails(gameId, payload.new.id)
            if (winnerDetails) {
              const callback = this.winnerCallbacks.get(gameId)
              if (callback) {
                callback(winnerDetails)
              }
            }
          }
        }
      )
      .subscribe()

    // Store subscriptions for cleanup
    this.subscriptions.set(gameId, {
      calledNumbers: calledNumbersSubscription,
      markedNumbers: markedNumbersSubscription,
      players: playersSubscription
    })

    console.log(`🔄 Real-time winner monitoring setup for game ${gameId}`)
  }

  // Check for winners in a game
  static async checkForWinners(gameId: string): Promise<void> {
    try {
      const winners = await WinningVerificationService.checkForWinners(gameId)
      
      if (winners.length > 0) {
        console.log(`🎉 ${winners.length} winner(s) found in game ${gameId}`)
        
        // Notify callback for first winner
        const callback = this.winnerCallbacks.get(gameId)
        if (callback && winners[0]) {
          const winnerDetails = await this.getWinnerDetails(gameId, winners[0].player?.id)
          if (winnerDetails) {
            callback(winnerDetails)
          }
        }
      }
    } catch (error) {
      console.error('Error checking for winners:', error)
    }
  }

  // Get detailed winner information
  static async getWinnerDetails(gameId: string, playerId: string): Promise<any> {
    try {
      // Get player details
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (playerError || !player) {
        console.error('Error fetching winner player:', playerError)
        return null
      }

      // Get winning pattern and prize info
      const result = await WinningVerificationService.verifyWinner(gameId, player.card_number)
      
      if (result.isWinner) {
        return {
          player: result.player,
          pattern: result.pattern,
          prize: result.prize,
          totalPot: result.totalPot,
          platformFee: result.platformFee,
          cardNumber: result.player?.card_number,
          name: result.player?.player_name,
          markedPositions: result.markedPositions,
          winPattern: result.pattern?.name
        }
      }

      return null
    } catch (error) {
      console.error('Error getting winner details:', error)
      return null
    }
  }

  // Manual winner verification (for admin verification)
  static async verifyWinnerManually(gameId: string, cardNumber: number): Promise<any> {
    try {
      const result = await WinningVerificationService.verifyWinner(gameId, cardNumber)
      
      if (result.isWinner && result.pattern && result.player) {
        // Declare winner
        const success = await WinningVerificationService.declareWinner(
          gameId,
          result.player.id,
          result.pattern.name
        )
        
        if (success) {
          return {
            success: true,
            isWinner: true,
            winner: {
              player: result.player,
              pattern: result.pattern,
              prize: result.prize,
              totalPot: result.totalPot,
              platformFee: result.platformFee,
              cardNumber: result.player.card_number,
              name: result.player.player_name,
              markedPositions: result.markedPositions
            }
          }
        } else {
          return {
            success: false,
            error: 'Failed to declare winner - game may already have a winner'
          }
        }
      } else {
        return {
          success: true,
          isWinner: false,
          message: 'No winning pattern found',
          patternStatus: result.markedPositions ? await this.getPatternStatus(gameId, cardNumber) : []
        }
      }
    } catch (error) {
      console.error('Error in manual winner verification:', error)
      return {
        success: false,
        error: 'Failed to verify winner'
      }
    }
  }

  // Get pattern completion status for debugging
  static async getPatternStatus(gameId: string, cardNumber: number): Promise<any[]> {
    try {
      const patterns = await WinningVerificationService.getActiveWinningPatterns()
      
      // Get player
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .eq('card_number', cardNumber)
        .single()

      if (!player) return []

      // Get marked positions
      const markedPositions = await WinningVerificationService.getPlayerMarkedPositions(gameId, player.id)
      
      return patterns.map(pattern => {
        const requiredPositions = pattern.pattern_positions
        const markedInPattern = requiredPositions.filter(pos => markedPositions.includes(pos))
        const completion = (markedInPattern.length / requiredPositions.length) * 100
        
        return {
          name: pattern.name,
          description: pattern.description,
          completion: Math.round(completion),
          markedCount: markedInPattern.length,
          totalCount: requiredPositions.length,
          missingPositions: requiredPositions.filter(pos => !markedPositions.includes(pos))
        }
      }).sort((a, b) => b.completion - a.completion)
    } catch (error) {
      console.error('Error getting pattern status:', error)
      return []
    }
  }

  // Cleanup subscriptions for a game
  static cleanup(gameId: string) {
    const subs = this.subscriptions.get(gameId)
    if (subs) {
      supabase.removeChannel(subs.calledNumbers)
      supabase.removeChannel(subs.markedNumbers)
      supabase.removeChannel(subs.players)
      this.subscriptions.delete(gameId)
    }
    
    this.winnerCallbacks.delete(gameId)
    console.log(`🧹 Cleaned up winner monitoring for game ${gameId}`)
  }

  // Cleanup all subscriptions
  static cleanupAll() {
    for (const gameId of this.subscriptions.keys()) {
      this.cleanup(gameId)
    }
  }
}