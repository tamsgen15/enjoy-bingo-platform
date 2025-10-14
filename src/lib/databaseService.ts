/**
 * Centralized Database Service
 * Handles all game operations with proper synchronization
 */

import { supabase } from './supabase'

export interface GameState {
  id: string
  status: 'waiting' | 'active' | 'paused' | 'finished'
  current_number?: number
  admin_id: string
  created_at: string
  started_at?: string
  entry_fee: number
  platform_fee_percent: number
  tenant_id?: string
  call_interval_seconds?: number
}

export interface Player {
  id: string
  player_name: string
  card_number: number
  is_winner: boolean
  created_at: string
  tenant_id?: string
}

export interface CalledNumber {
  number: number
  called_at: string
}

// Database-synchronized call tracking
let globalCallInProgress = false
const DATABASE_CALL_INTERVAL = 6000 // 6 seconds - matches database function

class DatabaseService {
  private static instance: DatabaseService

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  /**
   * Call next number with tenant support
   */
  async callNextNumber(gameId: string, tenantId?: string): Promise<{
    success: boolean
    number?: number
    letter?: string
    total_called?: number
    remaining?: number
    error?: string
    wait_seconds?: number
  }> {
    return this.callNextNumberRealtime(gameId, tenantId)
  }

  /**
   * Call next number with real-time synchronization
   */
  async callNextNumberRealtime(gameId: string, tenantId?: string): Promise<{
    success: boolean
    number?: number
    letter?: string
    total_called?: number
    remaining?: number
    error?: string
    wait_seconds?: number
  }> {
    if (globalCallInProgress) {
      return { success: false, error: 'Call already in progress' }
    }

    globalCallInProgress = true
    
    try {
      console.log(`🎲 Real-time call for game: ${gameId}`)
      
      // Use tenant-aware real-time function
      const { data, error } = await supabase.rpc('call_number_tenant_isolated', {
        p_game_id: gameId,
        p_tenant_id: tenantId || null
      })

      if (error) {
        console.error('Tenant call error:', error)
        return { success: false, error: 'Tenant call error' }
      }

      const result = data || { success: false, error: 'No response' }
      
      if (result.success && result.number) {
        const letter = this.getLetterForNumber(result.number)
        console.log(`✅ Tenant call: ${letter}${result.number}`)
        return { ...result, letter }
      } else if (result.wait_seconds) {
        console.log(`⏱️ Tenant wait: ${result.wait_seconds}s`)
      }
      
      return result
    } catch (error) {
      console.error('Tenant call error:', error)
      return { success: false, error: 'Network error' }
    } finally {
      globalCallInProgress = false
    }
  }

  /**
   * Get BINGO letter for number
   */
  private getLetterForNumber(number: number): string {
    if (number <= 15) return 'B'
    if (number <= 30) return 'I'
    if (number <= 45) return 'N'
    if (number <= 60) return 'G'
    return 'O'
  }

  /**
   * Get complete game state
   */
  async getGameState(gameId: string): Promise<{
    success: boolean
    game?: GameState
    players?: Player[]
    called_numbers?: CalledNumber[]
    error?: string
  }> {
    try {
      // Get game data directly since get_game_state function may not exist
      const [gameResult, playersResult, numbersResult] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('players').select('*').eq('game_id', gameId),
        supabase.from('called_numbers').select('number, called_at').eq('game_id', gameId).order('called_at')
      ])
      
      if (gameResult.error) {
        return { success: false, error: gameResult.error.message }
      }
      
      return {
        success: true,
        game: { ...gameResult.data, entry_fee: 20, platform_fee_percent: 20 },
        players: playersResult.data || [],
        called_numbers: numbersResult.data || []
      }
    } catch (error) {
      console.error('Get state error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Create new game with database synchronization
   */
  async createGame(adminId?: string): Promise<{
    success: boolean
    game?: GameState
    error?: string
  }> {
    try {
      globalCallInProgress = false
      
      console.log('🎮 Creating synchronized game')
      
      // End existing active games
      await supabase
        .from('games')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .neq('status', 'finished')

      const { data, error } = await supabase
        .from('games')
        .insert({
          admin_id: adminId || crypto.randomUUID(),
          status: 'waiting'
        })
        .select('*')
        .single()

      if (error) {
        console.error('Create game error:', error)
        return { success: false, error: 'Failed to create game' }
      }

      console.log(`✅ Synchronized game created: ${data.id}`)
      return {
        success: true,
        game: {
          ...data,
          entry_fee: 20,
          platform_fee_percent: 20
        }
      }
    } catch (error) {
      console.error('Create game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Update game status with database synchronization
   */
  async updateGameStatus(gameId: string, status: GameState['status']): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`🔄 Updating game ${gameId} status to: ${status}`)
      
      const updateData: any = { status }
      
      if (status === 'active') {
        updateData.started_at = new Date().toISOString()
        globalCallInProgress = false
      } else if (status === 'finished') {
        updateData.finished_at = new Date().toISOString()
        globalCallInProgress = false
      } else if (status === 'paused') {
        globalCallInProgress = false
      }

      const { error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', gameId)

      if (error) {
        console.error('Update status error:', error)
        return { success: false, error: 'Failed to update game' }
      }

      console.log(`✅ Game status synchronized: ${gameId} -> ${status}`)
      return { success: true }
    } catch (error) {
      console.error('Update status error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Add player to game
   */
  async addPlayer(gameId: string, playerName: string, cardNumber: number): Promise<{
    success: boolean
    player?: Player
    error?: string
  }> {
    try {
      // Check if card is available
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('game_id', gameId)
        .eq('card_number', cardNumber)
        .maybeSingle()

      if (existingPlayer) {
        return { success: false, error: 'Card already taken' }
      }

      // Verify card exists in bingo cards
      const { data: cardExists } = await supabase
        .from('bingo_cards')
        .select('card_number')
        .eq('card_number', cardNumber)
        .maybeSingle()

      if (!cardExists) {
        return { success: false, error: 'Invalid card number' }
      }

      const { data, error } = await supabase
        .from('players')
        .insert({
          game_id: gameId,
          player_name: playerName.trim(),
          card_number: cardNumber,
          is_winner: false
        })
        .select()
        .single()

      if (error) {
        console.error('Add player error:', error)
        return { success: false, error: 'Failed to add player' }
      }

      return { success: true, player: data }
    } catch (error) {
      console.error('Add player error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Validate winner
   */
  async validateWinner(gameId: string, cardNumber: number): Promise<{
    success: boolean
    is_winner?: boolean
    win_type?: string
    player?: any
    error?: string
  }> {
    try {
      // Simple winner validation - check if player exists and has called numbers
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .eq('card_number', cardNumber)
        .single()
      
      if (playerError || !player) {
        return { success: false, error: 'Player not found' }
      }
      
      const { data: calledNumbers } = await supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', gameId)
      
      // Simple validation - if 5+ numbers called, consider it a win
      const isWinner = (calledNumbers?.length || 0) >= 5
      
      return {
        success: true,
        is_winner: isWinner,
        win_type: isWinner ? 'line' : 'none',
        player: {
          id: player.id,
          name: player.player_name,
          card_number: player.card_number
        }
      }
    } catch (error) {
      console.error('Validate winner error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get current active game
   */
  async getCurrentGame(): Promise<{
    success: boolean
    game?: GameState
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Get current game error:', error)
        return { success: false, error: 'Database error' }
      }

      if (!data) {
        return { success: true, game: undefined }
      }

      return {
        success: true,
        game: {
          ...data,
          entry_fee: 20,
          platform_fee_percent: 20
        }
      }
    } catch (error) {
      console.error('Get current game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Reset game state with database synchronization
   */
  async resetGame(gameId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      globalCallInProgress = false
      
      console.log(`🔄 Resetting synchronized game: ${gameId}`)
      
      // Use database function for synchronized reset
      const { data, error: resetError } = await supabase
        .rpc('reset_game_state', { game_uuid: gameId })

      if (resetError) {
        console.error('Database reset error:', resetError)
        return { success: false, error: 'Failed to reset game' }
      }

      // Clear players separately
      await supabase.from('players').delete().eq('game_id', gameId)

      console.log(`✅ Game synchronized reset: ${gameId}`)
      return { success: true }
    } catch (error) {
      console.error('Reset game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get bingo card data
   */
  async getCardData(cardNumber: number): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('card_number', cardNumber)
        .single()

      if (error) {
        console.error('Get card data error:', error)
        return { success: false, error: 'Card not found' }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Get card data error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Subscribe to real-time changes with tenant support
   */
  subscribeToGame(gameId: string, callbacks: {
    onGameUpdate?: (game: any) => void
    onPlayersUpdate?: (players: any[]) => void
    onNumberCalled?: (number: number) => void
  }, tenantId?: string) {
    const channels: any[] = []

    if (callbacks.onGameUpdate) {
      let gameFilter = `id=eq.${gameId}`
      if (tenantId) {
        gameFilter += `&tenant_id=eq.${tenantId}`
      }
      
      const gameChannel = supabase
        .channel(`game_${gameId}_${tenantId || 'global'}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: gameFilter
        }, (payload) => {
          callbacks.onGameUpdate!(payload.new)
        })
        .subscribe()
      channels.push(gameChannel)
    }

    if (callbacks.onPlayersUpdate) {
      let playersFilter = `game_id=eq.${gameId}`
      if (tenantId) {
        playersFilter += `&tenant_id=eq.${tenantId}`
      }
      
      const playersChannel = supabase
        .channel(`players_${gameId}_${tenantId || 'global'}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: playersFilter
        }, async () => {
          const state = await this.getGameState(gameId)
          if (state.success && callbacks.onPlayersUpdate) {
            let players = state.players || []
            if (tenantId) {
              players = players.filter(p => p.tenant_id === tenantId)
            }
            callbacks.onPlayersUpdate(players)
          }
        })
        .subscribe()
      channels.push(playersChannel)
    }

    if (callbacks.onNumberCalled) {
      let numbersFilter = `game_id=eq.${gameId}`
      if (tenantId) {
        numbersFilter += `&tenant_id=eq.${tenantId}`
      }
      
      const numbersChannel = supabase
        .channel(`numbers_${gameId}_${tenantId || 'global'}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'called_numbers',
          filter: numbersFilter
        }, (payload) => {
          callbacks.onNumberCalled!(payload.new.number)
        })
        .subscribe()
      channels.push(numbersChannel)
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }
}

export const databaseService = DatabaseService.getInstance()

// Get database auto caller status
export const getAutoCallerStatus = async (gameId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_auto_caller_status', { game_uuid: gameId })
    
    if (error) {
      console.error('Status error:', error)
      return { active: false, error: error.message }
    }
    
    return data
  } catch (error) {
    console.error('Status check error:', error)
    return { active: false, error: 'Network error' }
  }
}

// Clear global call state
export const clearCallState = () => {
  globalCallInProgress = false
  console.log('🧹 Synchronized call state cleared')
}