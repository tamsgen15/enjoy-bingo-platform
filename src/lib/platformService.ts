/**
 * Platform Service - Multi-tenant platform management
 */

import { supabase } from './supabase'

export interface Tenant {
  id: string
  tenant_id: string
  tenant_name: string
  admin_email: string
  admin_phone?: string
  subscription_status: 'pending' | 'active' | 'expired' | 'suspended'
  monthly_fee: number
  start_date?: string
  end_date?: string
  created_at: string
  country?: string
  currency: string
  total_revenue: number
  games_hosted: number
}

export interface PlatformRevenue {
  id: string
  tenant_id: string
  payment_amount: number
  payment_date: string
  payment_method: string
  payment_status: string
  subscription_period_start?: string
  subscription_period_end?: string
  notes?: string
}

class PlatformService {
  private static instance: PlatformService

  static getInstance(): PlatformService {
    if (!PlatformService.instance) {
      PlatformService.instance = new PlatformService()
    }
    return PlatformService.instance
  }

  /**
   * Create new tenant
   */
  async createTenant(
    tenantName: string,
    adminEmail: string,
    adminPhone?: string,
    country?: string
  ): Promise<{
    success: boolean
    tenant_id?: string
    error?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('create_tenant', {
        p_tenant_name: tenantName,
        p_admin_email: adminEmail,
        p_admin_phone: adminPhone,
        p_country: country
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return data
    } catch (error) {
      console.error('Create tenant error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Activate tenant subscription
   */
  async activateSubscription(
    tenantId: string,
    paymentAmount: number = 20000
  ): Promise<{
    success: boolean
    end_date?: string
    error?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('activate_tenant_subscription', {
        p_tenant_id: tenantId,
        p_payment_amount: paymentAmount
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return data
    } catch (error) {
      console.error('Activate subscription error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Check tenant status
   */
  async checkTenantStatus(tenantId: string): Promise<{
    success: boolean
    tenant_id?: string
    status?: string
    end_date?: string
    days_remaining?: number
    error?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('check_tenant_status', {
        p_tenant_id: tenantId
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return data
    } catch (error) {
      console.error('Check tenant status error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get all tenants (platform owner)
   */
  async getAllTenants(): Promise<{
    success: boolean
    tenants?: Tenant[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, tenants: data }
    } catch (error) {
      console.error('Get tenants error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get tenant by email
   */
  async getTenantByEmail(email: string): Promise<{
    success: boolean
    tenant?: Tenant
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .eq('admin_email', email)
        .single()

      if (error) {
        return { success: false, error: 'Tenant not found' }
      }

      return { success: true, tenant: data }
    } catch (error) {
      console.error('Get tenant by email error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Update tenant status
   */
  async updateTenantStatus(
    tenantId: string,
    status: 'pending' | 'active' | 'expired' | 'suspended'
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await supabase
        .from('platform_subscriptions')
        .update({ 
          subscription_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Update tenant status error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get platform revenue
   */
  async getPlatformRevenue(): Promise<{
    success: boolean
    revenue?: PlatformRevenue[]
    total_revenue?: number
    monthly_revenue?: number
    active_tenants?: number
    error?: string
  }> {
    try {
      const [revenueResult, statsResult] = await Promise.all([
        supabase
          .from('platform_revenue')
          .select(`
            *,
            platform_subscriptions!inner(tenant_name, admin_email)
          `)
          .order('payment_date', { ascending: false }),
        
        supabase
          .from('platform_subscriptions')
          .select('subscription_status, monthly_fee')
      ])

      if (revenueResult.error || statsResult.error) {
        return { success: false, error: 'Failed to fetch revenue data' }
      }

      const totalRevenue = revenueResult.data?.reduce((sum, r) => sum + Number(r.payment_amount), 0) || 0
      const currentMonth = new Date().toISOString().slice(0, 7)
      const monthlyRevenue = revenueResult.data?.filter(r => 
        r.payment_date.startsWith(currentMonth)
      ).reduce((sum, r) => sum + Number(r.payment_amount), 0) || 0
      
      const activeTenants = statsResult.data?.filter(t => t.subscription_status === 'active').length || 0

      return {
        success: true,
        revenue: revenueResult.data,
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
        active_tenants: activeTenants
      }
    } catch (error) {
      console.error('Get platform revenue error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get tenant games and revenue
   */
  async getTenantRevenue(tenantId: string): Promise<{
    success: boolean
    games?: any[]
    total_revenue?: number
    games_count?: number
    error?: string
  }> {
    try {
      const { data: games, error } = await supabase
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

      // Calculate revenue (simplified - based on player count * entry fee)
      const totalRevenue = games?.reduce((sum, game) => {
        const playerCount = game.players?.[0]?.count || 0
        return sum + (playerCount * 20) // 20 ETB entry fee
      }, 0) || 0

      return {
        success: true,
        games: games || [],
        total_revenue: totalRevenue,
        games_count: games?.length || 0
      }
    } catch (error) {
      console.error('Get tenant revenue error:', error)
      return { success: false, error: 'Network error' }
    }
  }
}

export const platformService = PlatformService.getInstance()