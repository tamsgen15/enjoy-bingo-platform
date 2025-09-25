import { supabase } from './supabase'

export interface WinningPattern {
  id: string
  name: string
  pattern_positions: number[]
  description: string
  priority: number
  is_active: boolean
}

export interface GameRule {
  id: string
  rule_name: string
  rule_value: any
  description: string
  is_active: boolean
}

export interface WinnerResult {
  isWinner: boolean
  pattern?: WinningPattern
  player?: any
  prize?: number
  totalPot?: number
  platformFee?: number
  markedPositions?: number[]
}

export class WinningVerificationService {
  
  // Get all active winning patterns from database
  static async getActiveWinningPatterns(): Promise<WinningPattern[]> {
    try {
      // First get active pattern names from game rules
      const { data: activeRule } = await supabase
        .from('game_rules')
        .select('rule_value')
        .eq('rule_name', 'active_patterns')
        .eq('is_active', true)
        .single()

      const activePatternNames = activeRule?.rule_value || []

      // Get the actual patterns
      const { data: patterns, error } = await supabase
        .from('winning_patterns')
        .select('*')
        .eq('is_active', true)
        .in('name', activePatternNames)
        .order('priority', { ascending: true })

      if (error) throw error
      return patterns || []
    } catch (error) {
      console.error('Error fetching winning patterns:', error)
      return []
    }
  }

  // Get game rule by name
  static async getGameRule(ruleName: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('game_rules')
        .select('rule_value')
        .eq('rule_name', ruleName)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data?.rule_value
    } catch (error) {
      console.error(`Error fetching game rule ${ruleName}:`, error)
      return null
    }
  }

  // Convert card data to position mapping
  static cardToPositionMap(cardData: any): Map<number, number> {
    const positionMap = new Map<number, number>()
    
    // B column (positions 0-4)
    cardData.b_column?.forEach((num: number, idx: number) => {
      if (num) positionMap.set(num, idx)
    })
    
    // I column (positions 5-9)
    cardData.i_column?.forEach((num: number, idx: number) => {
      if (num) positionMap.set(num, idx + 5)
    })
    
    // N column (positions 10-14, center is 12)
    cardData.n_column?.forEach((num: number, idx: number) => {
      if (num) {
        const position = idx < 2 ? idx + 10 : idx + 11 // Skip center position
        positionMap.set(num, position)
      }
    })
    
    // G column (positions 15-19)
    cardData.g_column?.forEach((num: number, idx: number) => {
      if (num) positionMap.set(num, idx + 15)
    })
    
    // O column (positions 20-24)
    cardData.o_column?.forEach((num: number, idx: number) => {
      if (num) positionMap.set(num, idx + 20)
    })
    
    return positionMap
  }

  // Get player's marked positions
  static async getPlayerMarkedPositions(gameId: string, playerId: string): Promise<number[]> {
    try {
      const { data, error } = await supabase
        .from('player_marked_numbers')
        .select('marked_positions, auto_marked_positions')
        .eq('game_id', gameId)
        .eq('player_id', playerId)
        .single()

      if (error) throw error
      
      const manualMarked = data?.marked_positions || []
      const autoMarked = data?.auto_marked_positions || []
      
      // Combine and deduplicate
      const allMarked = [...new Set([...manualMarked, ...autoMarked, 12])] // Always include center
      return allMarked
    } catch (error) {
      console.error('Error fetching marked positions:', error)
      return [12] // At least center is marked
    }
  }

  // Check if pattern is completed
  static checkPatternCompletion(patternPositions: number[], markedPositions: number[]): boolean {
    return patternPositions.every(pos => markedPositions.includes(pos))
  }

  // Verify winner using database patterns with actual card data
  static async verifyWinner(gameId: string, cardNumber: number): Promise<WinnerResult> {
    try {
      // Use database function for accurate verification
      const { data, error } = await supabase.rpc('verify_winner_with_card', {
        p_game_id: gameId,
        p_card_number: cardNumber
      })

      if (error) throw error
      
      const result = data?.[0]
      if (!result) {
        return { isWinner: false }
      }

      if (result.is_winner) {
        // Calculate prize
        const { prize, totalPot, platformFee } = await this.calculatePrize(gameId)

        // Get pattern details
        const { data: patternData } = await supabase
          .from('winning_patterns')
          .select('*')
          .eq('name', result.winning_pattern)
          .single()

        return {
          isWinner: true,
          pattern: patternData || {
            name: result.winning_pattern,
            description: result.pattern_description,
            pattern_positions: this.getPatternPositions(result.winning_pattern)
          },
          player: {
            id: result.player_id,
            player_name: result.player_name,
            card_number: cardNumber
          },
          prize,
          totalPot,
          platformFee,
          markedPositions: result.marked_positions
        }
      }

      return { 
        isWinner: false, 
        player: {
          id: result.player_id,
          player_name: result.player_name,
          card_number: cardNumber
        },
        markedPositions: result.marked_positions
      }
    } catch (error) {
      console.error('Error verifying winner:', error)
      return { isWinner: false }
    }
  }

  // Calculate prize based on game rules
  static async calculatePrize(gameId: string): Promise<{ prize: number, totalPot: number, platformFee: number }> {
    try {
      // Get entry fee and prize distribution rules
      const entryFee = await this.getGameRule('entry_fee_amount') || 20
      const prizeDistribution = await this.getGameRule('prize_distribution') || { winner_percentage: 80, platform_fee: 20 }

      // Get total players
      const { count: playerCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId)

      const totalPot = (playerCount || 0) * entryFee
      const platformFee = totalPot * (prizeDistribution.platform_fee / 100)
      const prize = totalPot * (prizeDistribution.winner_percentage / 100)

      return { prize, totalPot, platformFee }
    } catch (error) {
      console.error('Error calculating prize:', error)
      return { prize: 0, totalPot: 0, platformFee: 0 }
    }
  }

  // Mark player as winner and finish game
  static async declareWinner(gameId: string, playerId: string, patternName: string): Promise<boolean> {
    try {
      // Check if multiple winners are allowed
      const multipleWinnersAllowed = await this.getGameRule('multiple_winners_allowed') || false

      if (!multipleWinnersAllowed) {
        // Check if there's already a winner
        const { data: existingWinner } = await supabase
          .from('players')
          .select('id')
          .eq('game_id', gameId)
          .eq('is_winner', true)
          .limit(1)

        if (existingWinner && existingWinner.length > 0) {
          return false // Game already has a winner
        }
      }

      // Mark player as winner
      const { error: playerError } = await supabase
        .from('players')
        .update({ 
          is_winner: true,
          winning_pattern: patternName
        })
        .eq('id', playerId)

      if (playerError) throw playerError

      // Update game status to finished
      const { error: gameError } = await supabase
        .from('games')
        .update({ 
          status: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', gameId)

      if (gameError) throw gameError

      return true
    } catch (error) {
      console.error('Error declaring winner:', error)
      return false
    }
  }

  // Auto-mark called number for all players
  static async autoMarkCalledNumber(gameId: string, calledNumber: number): Promise<number> {
    try {
      // Use the database function for auto-marking
      const { data, error } = await supabase.rpc('auto_mark_called_number', {
        p_game_id: gameId,
        p_called_number: calledNumber
      })

      if (error) throw error
      return data || 0
    } catch (error) {
      console.error('Error auto-marking number:', error)
      return 0
    }
  }

  // Check for winners after number is called
  static async checkForWinners(gameId: string): Promise<WinnerResult[]> {
    try {
      const winners: WinnerResult[] = []

      // Get all non-winner players
      const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_winner', false)

      if (error || !players) return winners

      // Check each player for winning patterns
      for (const player of players) {
        const result = await this.verifyWinner(gameId, player.card_number)
        if (result.isWinner) {
          winners.push(result)
          
          // Declare winner in database
          if (result.pattern) {
            await this.declareWinner(gameId, player.id, result.pattern.name)
          }
          
          // If multiple winners not allowed, stop after first winner
          const multipleWinnersAllowed = await this.getGameRule('multiple_winners_allowed') || false
          if (!multipleWinnersAllowed) {
            break
          }
        }
      }

      return winners
    } catch (error) {
      console.error('Error checking for winners:', error)
      return []
    }
  }

  // Get winning pattern description for display
  static getPatternDescription(patternName: string): string {
    const descriptions: { [key: string]: string } = {
      'Top Row': 'Complete top horizontal line',
      'Second Row': 'Complete second horizontal line', 
      'Middle Row': 'Complete middle horizontal line',
      'Fourth Row': 'Complete fourth horizontal line',
      'Bottom Row': 'Complete bottom horizontal line',
      'B Column': 'Complete B column',
      'I Column': 'Complete I column',
      'N Column': 'Complete N column',
      'G Column': 'Complete G column',
      'O Column': 'Complete O column',
      'Main Diagonal': 'Top-left to bottom-right diagonal',
      'Anti Diagonal': 'Top-right to bottom-left diagonal',
      'Four Corners': 'All four corner positions',
      'X Pattern': 'Both diagonals forming X',
      'Full House': 'All 25 positions marked'
    }
    
    return descriptions[patternName] || patternName
  }

  // Get pattern positions for highlighting
  static getPatternPositions(patternName: string): number[] {
    const patterns: { [key: string]: number[] } = {
      'Top Row': [0,1,2,3,4],
      'Second Row': [5,6,7,8,9],
      'Middle Row': [10,11,12,13,14],
      'Fourth Row': [15,16,17,18,19],
      'Bottom Row': [20,21,22,23,24],
      'B Column': [0,5,10,15,20],
      'I Column': [1,6,11,16,21],
      'N Column': [2,7,12,17,22],
      'G Column': [3,8,13,18,23],
      'O Column': [4,9,14,19,24],
      'Main Diagonal': [0,6,12,18,24],
      'Anti Diagonal': [4,8,12,16,20],
      'Four Corners': [0,4,20,24],
      'X Pattern': [0,6,12,18,24,4,8,16,20],
      'Full House': Array.from({length: 25}, (_, i) => i)
    }
    
    return patterns[patternName] || []
  }
}