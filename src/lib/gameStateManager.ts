/**
 * Enhanced Game State Manager
 * Provides centralized game state management with proper synchronization
 */

import { supabase } from './supabase'

export interface GameState {
  id: string
  status: 'waiting' | 'active' | 'paused' | 'finished'
  admin_id: string
  current_number?: number
  called_numbers: number[]
  created_at: string
  started_at?: string
  finished_at?: string
}

export interface Player {
  id: string
  game_id: string
  player_name: string
  selected_card_number: number
  is_winner: boolean
  created_at: string
}

export interface CalledNumber {
  id: string
  game_id: string
  number: number
  called_at: string
}

export class GameStateManager {
  private static instance: GameStateManager
  private gameCache = new Map<string, GameState>()
  private playersCache = new Map<string, Player[]>()
  private calledNumbersCache = new Map<string, number[]>()

  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager()
    }
    return GameStateManager.instance
  }

  /**
   * Safely call the next number using the enhanced database function
   */
  async callNextNumber(gameId: string): Promise<{
    success: boolean
    number?: number
    total_called?: number
    remaining?: number
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .rpc('call_next_number', { game_uuid: gameId })

      if (error) {
        console.error('Database error calling number:', error)
        return { success: false, error: 'Database error' }
      }

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Failed to call number',
          total_called: data?.total_called
        }
      }

      // Update local cache
      this.invalidateGameCache(gameId)
      
      return {
        success: true,
        number: data.number,
        total_called: data.total_called,
        remaining: data.remaining
      }
    } catch (error) {
      console.error('Error calling number:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get current game state with caching
   */
  async getGameState(gameId: string, useCache = true): Promise<GameState | null> {
    if (useCache && this.gameCache.has(gameId)) {
      return this.gameCache.get(gameId)!
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      if (error || !data) {
        return null
      }

      const gameState: GameState = {
        ...data,
        called_numbers: data.called_numbers || []
      }

      this.gameCache.set(gameId, gameState)
      return gameState
    } catch (error) {
      console.error('Error fetching game state:', error)
      return null
    }
  }

  /**
   * Get called numbers for a game with proper ordering
   */
  async getCalledNumbers(gameId: string, useCache = true): Promise<number[]> {
    if (useCache && this.calledNumbersCache.has(gameId)) {
      return this.calledNumbersCache.get(gameId)!
    }

    try {
      const { data, error } = await supabase
        .from('called_numbers')
        .select('number')
        .eq('game_id', gameId)
        .order('called_at', { ascending: true })

      if (error) {
        console.error('Error fetching called numbers:', error)
        return []
      }

      const numbers = data?.map(item => item.number) || []
      this.calledNumbersCache.set(gameId, numbers)
      return numbers
    } catch (error) {
      console.error('Error fetching called numbers:', error)
      return []
    }
  }

  /**
   * Get players for a game
   */
  async getPlayers(gameId: string, useCache = true): Promise<Player[]> {
    if (useCache && this.playersCache.has(gameId)) {
      return this.playersCache.get(gameId)!
    }

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching players:', error)
        return []
      }

      const players = data || []
      this.playersCache.set(gameId, players)
      return players
    } catch (error) {
      console.error('Error fetching players:', error)
      return []
    }
  }

  /**
   * Check game integrity and health
   */
  async checkGameIntegrity(gameId: string): Promise<{
    success: boolean
    is_healthy: boolean
    issues: string[]
    called_count: number
    array_count: number
  }> {
    try {
      const { data, error } = await supabase
        .rpc('check_game_integrity', { game_uuid: gameId })

      if (error) {
        console.error('Error checking game integrity:', error)
        return {
          success: false,
          is_healthy: false,
          issues: ['Database error'],
          called_count: 0,
          array_count: 0
        }
      }

      return {
        success: data.success,
        is_healthy: data.is_healthy,
        issues: data.issues || [],
        called_count: data.called_count || 0,
        array_count: data.array_count || 0
      }
    } catch (error) {
      console.error('Error checking game integrity:', error)
      return {
        success: false,
        is_healthy: false,
        issues: ['Unknown error'],
        called_count: 0,
        array_count: 0
      }
    }
  }

  /**
   * Reset game state completely
   */
  async resetGameState(gameId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('reset_game_state', { game_uuid: gameId })

      if (error) {
        console.error('Error resetting game state:', error)
        return { success: false, error: 'Database error' }
      }

      // Clear all caches for this game
      this.invalidateGameCache(gameId)
      
      return {
        success: data.success,
        message: data.message
      }
    } catch (error) {
      console.error('Error resetting game state:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create a new game with proper initialization
   */
  async createGame(adminId?: string): Promise<{ success: boolean; game?: GameState; error?: string }> {
    try {
      const gameAdminId = adminId || crypto.randomUUID()
      
      const { data, error } = await supabase
        .from('games')
        .insert({
          admin_id: gameAdminId,
          status: 'waiting',
          called_numbers: []
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating game:', error)
        return { success: false, error: 'Failed to create game' }
      }

      const gameState: GameState = {
        ...data,
        called_numbers: data.called_numbers || []
      }

      this.gameCache.set(data.id, gameState)
      return { success: true, game: gameState }
    } catch (error) {
      console.error('Error creating game:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update game status
   */
  async updateGameStatus(
    gameId: string, 
    status: GameState['status'], 
    additionalData?: Partial<GameState>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { status }
      
      if (status === 'active' && !additionalData?.started_at) {
        updateData.started_at = new Date().toISOString()
      } else if (status === 'finished' && !additionalData?.finished_at) {
        updateData.finished_at = new Date().toISOString()
      }

      if (additionalData) {
        Object.assign(updateData, additionalData)
      }

      const { error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', gameId)

      if (error) {
        console.error('Error updating game status:', error)
        return { success: false, error: 'Failed to update game status' }
      }

      // Update cache
      this.invalidateGameCache(gameId)
      
      return { success: true }
    } catch (error) {
      console.error('Error updating game status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Add a player to the game
   */
  async addPlayer(
    gameId: string, 
    playerName: string, 
    cardNumber: number
  ): Promise<{ success: boolean; player?: Player; error?: string }> {
    try {
      // Check if card is already taken
      const existingPlayers = await this.getPlayers(gameId, false)
      if (existingPlayers.some(p => p.selected_card_number === cardNumber)) {
        return { success: false, error: 'Card already taken' }
      }

      const { data, error } = await supabase
        .from('players')
        .insert({
          game_id: gameId,
          player_name: playerName,
          selected_card_number: cardNumber,
          is_winner: false
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error adding player:', error)
        return { success: false, error: 'Failed to add player' }
      }

      // Update cache
      this.playersCache.delete(gameId)
      
      return { success: true, player: data }
    } catch (error) {
      console.error('Error adding player:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clear cache for a specific game
   */
  private invalidateGameCache(gameId: string): void {
    this.gameCache.delete(gameId)
    this.playersCache.delete(gameId)
    this.calledNumbersCache.delete(gameId)
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.gameCache.clear()
    this.playersCache.clear()
    this.calledNumbersCache.clear()
  }

  /**
   * Subscribe to real-time changes for a game
   */
  subscribeToGame(
    gameId: string,
    callbacks: {
      onGameUpdate?: (game: any) => void
      onPlayerUpdate?: (players: any[]) => void
      onNumberCalled?: (number: number) => void
    }
  ) {
    const channels: any[] = []

    if (callbacks.onGameUpdate) {
      const gameChannel = supabase
        .channel(`game_${gameId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        }, (payload) => {
          const gameState = payload.new as GameState
          this.gameCache.set(gameId, gameState)
          callbacks.onGameUpdate!(gameState)
        })
        .subscribe()
      channels.push(gameChannel)
    }

    if (callbacks.onPlayerUpdate) {
      const playersChannel = supabase
        .channel(`players_${gameId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`
        }, async () => {
          const players = await this.getPlayers(gameId, false)
          callbacks.onPlayerUpdate!(players)
        })
        .subscribe()
      channels.push(playersChannel)
    }

    if (callbacks.onNumberCalled) {
      const numbersChannel = supabase
        .channel(`called_numbers_${gameId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'called_numbers',
          filter: `game_id=eq.${gameId}`
        }, (payload) => {
          const numbers = this.calledNumbersCache.get(gameId) || []
          if (!numbers.includes(payload.new.number)) {
            numbers.push(payload.new.number)
            this.calledNumbersCache.set(gameId, numbers)
            callbacks.onNumberCalled!(payload.new.number)
          }
        })
        .subscribe()
      channels.push(numbersChannel)
    }

    // Return cleanup function
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }
}

// Export singleton instance
export const gameStateManager = GameStateManager.getInstance()