/**
 * Tenant Service - Manages tenant-specific game operations
 */

import { supabase } from './supabase'
import { databaseService } from './databaseService'

export interface TenantGame {
  id: string
  status: 'waiting' | 'active' | 'paused' | 'finished'
  current_number?: number
  admin_id: string
  tenant_id: string
  created_at: string
  started_at?: string
  finished_at?: string
  entry_fee: number
  platform_fee_percent: number
  player_count?: number
  total_revenue?: number
}

class TenantService {
  private static instance: TenantService

  static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService()
    }
    return TenantService.instance
  }

  /**
   * Validate tenant subscription before operations
   */
  private async validateTenantAccess(tenantId: string): Promise<{
    valid: boolean
    error?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('check_tenant_status', {
        p_tenant_id: tenantId
      })

      if (error || !data.success) {
        return { valid: false, error: 'Tenant not found' }
      }

      if (data.status !== 'active') {
        return { 
          valid: false, 
          error: `Subscription ${data.status}. Please renew to continue.` 
        }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Validation error' }
    }
  }

  /**
   * Create tenant-specific game
   */
  async createTenantGame(tenantId: string, adminId: string): Promise<{
    success: boolean
    game?: TenantGame
    error?: string
  }> {
    // Validate tenant access
    const validation = await this.validateTenantAccess(tenantId)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    try {
      // End existing active games for this tenant
      await supabase
        .from('games')
        .update({ 
          status: 'finished', 
          finished_at: new Date().toISOString() 
        })
        .eq('tenant_id', tenantId)
        .neq('status', 'finished')

      const { data, error } = await supabase
        .from('games')
        .insert({
          admin_id: adminId,
          tenant_id: tenantId,
          status: 'waiting'
        })
        .select('*')
        .single()

      if (error) {
        return { success: false, error: 'Failed to create game' }
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
      console.error('Create tenant game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get tenant games
   */
  async getTenantGames(tenantId: string): Promise<{
    success: boolean
    games?: TenantGame[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          players!inner(count)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const games = data?.map(game => ({
        ...game,
        entry_fee: 20,
        platform_fee_percent: 20,
        player_count: game.players?.[0]?.count || 0,
        total_revenue: (game.players?.[0]?.count || 0) * 20
      })) || []

      return { success: true, games }
    } catch (error) {
      console.error('Get tenant games error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get current active tenant game
   */
  async getCurrentTenantGame(tenantId: string): Promise<{
    success: boolean
    game?: TenantGame
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          players!inner(count)
        `)
        .eq('tenant_id', tenantId)
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: true, game: undefined }
      }

      return {
        success: true,
        game: {
          ...data,
          entry_fee: 20,
          platform_fee_percent: 20,
          player_count: data.players?.[0]?.count || 0,
          total_revenue: (data.players?.[0]?.count || 0) * 20
        }
      }
    } catch (error) {
      console.error('Get current tenant game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Call next number for tenant game
   */
  async callNextNumber(gameId: string, tenantId: string): Promise<{
    success: boolean
    number?: number
    letter?: string
    total_called?: number
    remaining?: number
    error?: string
  }> {
    // Validate tenant access
    const validation = await this.validateTenantAccess(tenantId)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    return await databaseService.callNextNumber(gameId, tenantId)
  }

  /**
   * Update tenant game status
   */
  async updateTenantGameStatus(
    gameId: string, 
    tenantId: string, 
    status: 'waiting' | 'active' | 'paused' | 'finished'
  ): Promise<{
    success: boolean
    error?: string
  }> {
    // Validate tenant access
    const validation = await this.validateTenantAccess(tenantId)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    try {
      const updateData: any = { status }
      
      if (status === 'active') {
        updateData.started_at = new Date().toISOString()
      } else if (status === 'finished') {
        updateData.finished_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', gameId)
        .eq('tenant_id', tenantId)

      if (error) {
        return { success: false, error: 'Failed to update game' }
      }

      return { success: true }
    } catch (error) {
      console.error('Update tenant game status error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Add player to tenant game
   */
  async addPlayerToTenantGame(
    gameId: string,
    tenantId: string,
    playerName: string,
    cardNumber: number
  ): Promise<{
    success: boolean
    player?: any
    error?: string
  }> {
    try {
      // Check if card is available for this tenant's game
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('game_id', gameId)
        .eq('tenant_id', tenantId)
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
          tenant_id: tenantId,
          player_name: playerName.trim(),
          card_number: cardNumber,
          is_winner: false
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: 'Failed to add player' }
      }

      return { success: true, player: data }
    } catch (error) {
      console.error('Add player to tenant game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get tenant revenue summary
   */
  async getTenantRevenue(tenantId: string): Promise<{
    success: boolean
    total_revenue?: number
    games_count?: number
    players_count?: number
    error?: string
  }> {
    try {
      const [gamesResult, playersResult] = await Promise.all([
        supabase
          .from('games')
          .select('id, status')
          .eq('tenant_id', tenantId),
        
        supabase
          .from('players')
          .select('id')
          .eq('tenant_id', tenantId)
      ])

      if (gamesResult.error || playersResult.error) {
        return { success: false, error: 'Failed to fetch revenue data' }
      }

      const gamesCount = gamesResult.data?.length || 0
      const playersCount = playersResult.data?.length || 0
      const totalRevenue = playersCount * 20 // 20 ETB per player

      return {
        success: true,
        total_revenue: totalRevenue,
        games_count: gamesCount,
        players_count: playersCount
      }
    } catch (error) {
      console.error('Get tenant revenue error:', error)
      return { success: false, error: 'Network error' }
    }
  }
}

export const tenantService = TenantService.getInstance()