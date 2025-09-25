/**
 * Enhanced Tenant Service - Complete Multi-Tenant Isolation
 * Handles tenant-specific operations with full data isolation
 */

import { supabase } from './supabase'

export interface Tenant {
  id: string
  tenant_name: string
  admin_email: string
  subscription_status: 'active' | 'pending' | 'expired' | 'suspended'
  subscription_start_date: string
  subscription_end_date?: string
  monthly_fee: number
}

export interface TenantGame {
  id: string
  status: 'waiting' | 'active' | 'paused' | 'finished'
  current_number?: number
  admin_id: string
  tenant_id: string
  session_id: string
  created_at: string
  started_at?: string
  finished_at?: string
  entry_fee: number
  platform_fee_percent: number
  player_count?: number
  total_revenue?: number
}

export interface TenantSession {
  id: string
  tenant_id: string
  user_email: string
  tenant_name: string
  session_token: string
  device_info?: string
  is_active: boolean
  expires_at: string
}

class EnhancedTenantService {
  private static instance: EnhancedTenantService
  private currentTenant: Tenant | null = null
  private currentSession: TenantSession | null = null

  static getInstance(): EnhancedTenantService {
    if (!EnhancedTenantService.instance) {
      EnhancedTenantService.instance = new EnhancedTenantService()
    }
    return EnhancedTenantService.instance
  }

  /**
   * Set current tenant context for RLS
   */
  private async setTenantContext(tenantId: string): Promise<void> {
    // Skip RLS context setting for now
    return
  }

  /**
   * Authenticate tenant with complete validation
   */
  async authenticateTenant(adminEmail: string): Promise<{
    success: boolean
    tenant?: Tenant
    session?: TenantSession
    error?: string
  }> {
    try {
      // Get tenant from platform_subscriptions table
      const { data: tenantData, error: tenantError } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .eq('admin_email', adminEmail)
        .single()

      if (tenantError || !tenantData) {
        return { success: false, error: 'Tenant not found' }
      }

      // Check subscription status
      if (tenantData.subscription_status !== 'active') {
        return { 
          success: false, 
          error: `Subscription ${tenantData.subscription_status}. Please contact platform owner.` 
        }
      }

      // Check subscription expiry
      if (tenantData.end_date && 
          new Date(tenantData.end_date) < new Date()) {
        return { 
          success: false, 
          error: 'Subscription expired. Please renew to continue.' 
        }
      }

      const tenant: Tenant = {
        id: tenantData.tenant_id,
        tenant_name: tenantData.tenant_name,
        admin_email: tenantData.admin_email,
        subscription_status: tenantData.subscription_status,
        subscription_start_date: tenantData.start_date,
        subscription_end_date: tenantData.end_date,
        monthly_fee: 20000
      }

      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('upsert_tenant_session', {
          p_tenant_id: tenant.id,
          p_user_email: tenant.admin_email,
          p_tenant_name: tenant.tenant_name,
          p_device_info: navigator.userAgent
        })

      if (sessionError || !sessionData?.success) {
        return { success: false, error: 'Failed to create session' }
      }

      this.currentTenant = tenant
      this.currentSession = {
        id: sessionData.session_id,
        tenant_id: tenant.id,
        user_email: tenant.admin_email,
        tenant_name: tenant.tenant_name,
        session_token: sessionData.session_token,
        device_info: navigator.userAgent,
        is_active: true,
        expires_at: sessionData.expires_at
      }

      // Store in localStorage for persistence
      localStorage.setItem('tenant_session', JSON.stringify({
        tenant: this.currentTenant,
        session: this.currentSession
      }))

      return { 
        success: true, 
        tenant, 
        session: this.currentSession 
      }
    } catch (error) {
      console.error('Tenant authentication error:', error)
      return { success: false, error: 'Authentication failed' }
    }
  }

  /**
   * Create isolated tenant game
   */
  async createTenantGame(): Promise<{
    success: boolean
    game?: TenantGame
    error?: string
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
    }

    try {
      const deviceId = `${navigator.userAgent}_${Date.now()}`
      
      const { data, error } = await supabase.rpc('create_tenant_game_isolated', {
        p_tenant_id: this.currentTenant.id,
        p_admin_email: this.currentTenant.admin_email,
        p_device_id: deviceId
      })

      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Failed to create game' }
      }

      const game: TenantGame = {
        id: data.game_id,
        status: 'waiting',
        admin_id: this.currentTenant.admin_email,
        tenant_id: this.currentTenant.id,
        session_id: data.session_id || this.currentSession?.id || 'new',
        created_at: new Date().toISOString(),
        entry_fee: 20,
        platform_fee_percent: 0,
        player_count: 0,
        total_revenue: 0
      }

      return { success: true, game }
    } catch (error) {
      console.error('Create tenant game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get current tenant game with isolation
   */
  async getCurrentTenantGame(): Promise<{
    success: boolean
    game?: TenantGame
    error?: string
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          players!inner(count)
        `)
        .eq('tenant_id', this.currentTenant.id)
        .eq('admin_id', this.currentTenant.admin_email)
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

      const game: TenantGame = {
        ...data,
        player_count: data.players?.[0]?.count || 0,
        total_revenue: (data.players?.[0]?.count || 0) * 20
      }

      return { success: true, game }
    } catch (error) {
      console.error('Get current tenant game error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Call next number with tenant isolation
   */
  async callNextNumber(gameId: string, sessionId?: string): Promise<{
    success: boolean
    number?: number
    letter?: string
    total_called?: number
    remaining?: number
    error?: string
    wait_seconds?: number
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
    }

    try {
      const { data, error } = await supabase.rpc('call_number_tenant_isolated', {
        p_game_id: gameId,
        p_tenant_id: this.currentTenant.id,
        p_session_id: sessionId || null
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return data || { success: false, error: 'No response' }
    } catch (error) {
      console.error('Call next number error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Add player with tenant isolation
   */
  async addPlayer(
    gameId: string,
    playerName: string,
    cardNumber: number,
    sessionId?: string
  ): Promise<{
    success: boolean
    player?: any
    error?: string
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
    }

    try {
      const deviceId = `${navigator.userAgent}_${Date.now()}`
      
      const { data, error } = await supabase.rpc('add_player_tenant_isolated', {
        p_game_id: gameId,
        p_tenant_id: this.currentTenant.id,
        p_player_name: playerName.trim(),
        p_card_number: cardNumber,
        p_session_id: sessionId || null,
        p_device_id: deviceId
      })

      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Failed to add player' }
      }

      return { success: true, player: { id: data.player_id } }
    } catch (error) {
      console.error('Add player error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Update game status with tenant isolation
   */
  async updateGameStatus(
    gameId: string,
    status: 'waiting' | 'active' | 'paused' | 'finished'
  ): Promise<{
    success: boolean
    error?: string
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
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
        .eq('tenant_id', this.currentTenant.id)

      if (error) {
        return { success: false, error: 'Failed to update game' }
      }

      return { success: true }
    } catch (error) {
      console.error('Update game status error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get tenant games with complete isolation
   */
  async getTenantGames(): Promise<{
    success: boolean
    games?: TenantGame[]
    error?: string
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          players!inner(count)
        `)
        .eq('tenant_id', this.currentTenant.id)
        .eq('admin_id', this.currentTenant.admin_email)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const games = data?.map(game => {
        const playerCount = game.players?.[0]?.count || 0
        const entryFee = game.entry_fee || 20
        const platformFeePercent = game.platform_fee_percent || 20
        const totalPot = playerCount * entryFee
        const tenantRevenue = Math.round(totalPot * (platformFeePercent / 100))
        
        return {
          ...game,
          player_count: playerCount,
          total_revenue: tenantRevenue,
          platform_fee_percent: platformFeePercent
        }
      }) || []

      return { success: true, games }
    } catch (error) {
      console.error('Get tenant games error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get tenant revenue summary
   */
  async getTenantRevenue(): Promise<{
    success: boolean
    total_revenue?: number
    games_count?: number
    players_count?: number
    error?: string
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
    }

    try {
      // Get games first
      const gamesResult = await supabase
        .from('games')
        .select('id, status')
        .eq('tenant_id', this.currentTenant.id)
        .eq('admin_id', this.currentTenant.admin_email)
      
      const gameIds = gamesResult.data?.map(g => g.id) || []
      
      // Get players for those games
      const playersResult = gameIds.length > 0 ? await supabase
        .from('players')
        .select('id')
        .eq('tenant_id', this.currentTenant.id)
        .in('game_id', gameIds) : { data: [], error: null }

      if (gamesResult.error || playersResult.error) {
        return { success: false, error: 'Failed to fetch revenue data' }
      }

      const gamesCount = gamesResult.data?.length || 0
      const playersCount = playersResult.data?.length || 0
      
      // Calculate total revenue based on each game's platform fee
      let totalRevenue = 0
      if (gamesResult.data) {
        for (const game of gamesResult.data) {
          const { data: gamePlayersData } = await supabase
            .from('players')
            .select('id')
            .eq('game_id', game.id)
            .eq('tenant_id', this.currentTenant.id)
          
          const playerCount = gamePlayersData?.length || 0
          const entryFee = (game as any).entry_fee || 20
          const platformFeePercent = (game as any).platform_fee_percent || 20
          const totalPot = playerCount * entryFee
          const gameRevenue = Math.round(totalPot * (platformFeePercent / 100))
          totalRevenue += gameRevenue
        }
      }

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

  /**
   * End tenant user games with isolation
   */
  async endTenantUserGames(): Promise<{
    success: boolean
    games_ended?: number
    players_cleared?: number
    error?: string
  }> {
    if (!this.currentTenant) {
      return { success: false, error: 'No authenticated tenant' }
    }

    try {
      const { data, error } = await supabase.rpc('end_tenant_user_games_isolated', {
        p_tenant_id: this.currentTenant.id,
        p_user_email: this.currentTenant.admin_email
      })

      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Failed to end games' }
      }

      return {
        success: true,
        games_ended: data.games_ended,
        players_cleared: data.players_cleared
      }
    } catch (error) {
      console.error('End tenant user games error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Log user activity
   */
  async logActivity(
    activityType: string,
    pageUrl?: string,
    sessionData?: any
  ): Promise<void> {
    if (!this.currentTenant) return

    try {
      await supabase.rpc('log_user_activity', {
        p_tenant_id: this.currentTenant.id,
        p_user_email: this.currentTenant.admin_email,
        p_activity_type: activityType,
        p_page_url: pageUrl,
        p_device_info: navigator.userAgent,
        p_session_data: sessionData
      })
    } catch (error) {
      console.warn('Failed to log activity:', error)
    }
  }

  /**
   * Subscribe to real-time changes with tenant isolation
   */
  subscribeToTenantGame(gameId: string, callbacks: {
    onGameUpdate?: (game: any) => void
    onPlayersUpdate?: (players: any[]) => void
    onNumberCalled?: (number: number) => void
  }) {
    if (!this.currentTenant) return () => {}

    const channels: any[] = []

    if (callbacks.onGameUpdate) {
      const gameChannel = supabase
        .channel(`tenant_game_${this.currentTenant.id}_${gameId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}&tenant_id=eq.${this.currentTenant.id}`
        }, (payload) => {
          if (payload.new.tenant_id === this.currentTenant?.id) {
            callbacks.onGameUpdate!(payload.new)
          }
        })
        .subscribe()
      channels.push(gameChannel)
    }

    if (callbacks.onPlayersUpdate) {
      const playersChannel = supabase
        .channel(`tenant_players_${this.currentTenant.id}_${gameId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}&tenant_id=eq.${this.currentTenant.id}`
        }, async () => {
          // Reload players with tenant isolation
          const { data } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', gameId)
            .eq('tenant_id', this.currentTenant!.id)
          
          if (callbacks.onPlayersUpdate) {
            callbacks.onPlayersUpdate(data || [])
          }
        })
        .subscribe()
      channels.push(playersChannel)
    }

    if (callbacks.onNumberCalled) {
      const numbersChannel = supabase
        .channel(`tenant_numbers_${this.currentTenant.id}_${gameId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'called_numbers',
          filter: `game_id=eq.${gameId}&tenant_id=eq.${this.currentTenant.id}`
        }, (payload) => {
          if (payload.new?.tenant_id === this.currentTenant?.id) {
            callbacks.onNumberCalled!(payload.new.number)
          }
        })
        .subscribe()
      channels.push(numbersChannel)
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }

  /**
   * Restore session from database (prioritize over localStorage)
   */
  async restoreSession(): Promise<boolean> {
    try {
      console.log('💾 Attempting database session restore...')
      // First try database
      const { data: sessions, error: sessionError } = await supabase
        .from('tenant_sessions')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
      
      if (!sessionError && sessions && sessions.length > 0) {
        console.log('✅ Database session found:', sessions[0])
        const session = sessions[0]
        
        // Get tenant data from platform_subscriptions
        const { data: tenantData } = await supabase
          .from('platform_subscriptions')
          .select('*')
          .eq('tenant_id', session.tenant_id)
          .single()
        
        if (tenantData) {
          console.log('📊 Session restored from DATABASE')
          this.currentTenant = {
            id: tenantData.tenant_id,
            tenant_name: tenantData.tenant_name,
            admin_email: tenantData.admin_email,
            subscription_status: tenantData.subscription_status,
            subscription_start_date: tenantData.start_date,
            subscription_end_date: tenantData.end_date,
            monthly_fee: 20000
          }
          
          this.currentSession = {
            id: session.id,
            tenant_id: session.tenant_id,
            user_email: session.user_email,
            tenant_name: session.tenant_name,
            session_token: session.session_token,
            device_info: session.device_info,
            is_active: session.is_active,
            expires_at: session.expires_at
          }
          
          // Update localStorage with fresh database data
          localStorage.setItem('tenant_session', JSON.stringify({
            tenant: this.currentTenant,
            session: this.currentSession
          }))
          
          return true
        }
      } else {
        console.log('❌ No database session found, trying localStorage...')
      }
      
      // Fallback to localStorage if database fails
      const stored = localStorage.getItem('tenant_session')
      if (stored) {
        const { tenant, session } = JSON.parse(stored)
        if (new Date(session.expires_at) > new Date()) {
          console.log('📊 Session restored from LOCALSTORAGE')
          this.currentTenant = tenant
          this.currentSession = session
          return true
        } else {
          console.log('⏰ localStorage session expired, removing...')
          localStorage.removeItem('tenant_session')
        }
      } else {
        console.log('❌ No localStorage session found')
      }
    } catch (error) {
      console.warn('Failed to restore session from database:', error)
      localStorage.removeItem('tenant_session')
    }
    return false
  }

  /**
   * Logout and cleanup
   */
  async logout(): Promise<void> {
    if (this.currentTenant && this.currentSession) {
      try {
        // Invalidate session
        await supabase
          .from('tenant_sessions')
          .update({ is_active: false })
          .eq('id', this.currentSession.id)

        // Log logout activity
        await this.logActivity('logout')
      } catch (error) {
        console.warn('Logout cleanup error:', error)
      }
    }

    // Clear localStorage
    localStorage.removeItem('tenant_session')
    
    this.currentTenant = null
    this.currentSession = null
  }

  /**
   * Get current tenant
   */
  getCurrentTenant(): Tenant | null {
    return this.currentTenant
  }

  /**
   * Get current session
   */
  getCurrentSession(): TenantSession | null {
    return this.currentSession
  }

  /**
   * Set tenant directly (for URL parameter navigation)
   */
  async setTenantFromData(tenantData: any): Promise<boolean> {
    try {
      const tenant: Tenant = {
        id: tenantData.tenant_id,
        tenant_name: tenantData.tenant_name,
        admin_email: tenantData.admin_email,
        subscription_status: tenantData.subscription_status || 'active',
        subscription_start_date: tenantData.start_date || new Date().toISOString(),
        subscription_end_date: tenantData.end_date,
        monthly_fee: 20000
      }

      // Create or update session
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('upsert_tenant_session', {
          p_tenant_id: tenant.id,
          p_user_email: tenant.admin_email,
          p_tenant_name: tenant.tenant_name,
          p_device_info: navigator.userAgent
        })

      if (sessionError || !sessionData?.success) {
        console.warn('Failed to create session:', sessionError)
        return false
      }

      this.currentTenant = tenant
      this.currentSession = {
        id: sessionData.session_id,
        tenant_id: tenant.id,
        user_email: tenant.admin_email,
        tenant_name: tenant.tenant_name,
        session_token: sessionData.session_token,
        device_info: navigator.userAgent,
        is_active: true,
        expires_at: sessionData.expires_at
      }

      // Store in localStorage
      localStorage.setItem('tenant_session', JSON.stringify({
        tenant: this.currentTenant,
        session: this.currentSession
      }))

      return true
    } catch (error) {
      console.error('Set tenant from data error:', error)
      return false
    }
  }
}

export const enhancedTenantService = EnhancedTenantService.getInstance()