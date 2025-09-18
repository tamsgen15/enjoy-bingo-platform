import { supabase } from './supabase'

export const trackPlayerRevenue = async (gameId: string, playerId: string) => {
  try {
    // Get platform settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('*')
    
    const entryFee = settings?.find((s: any) => s.setting_key === 'entry_fee_per_card')?.setting_value || '20'
    const platformFeePercent = settings?.find((s: any) => s.setting_key === 'platform_fee_percentage')?.setting_value || '20'
    
    const entryFeeAmount = parseFloat(entryFee)
    const platformFeeAmount = entryFeeAmount * (parseFloat(platformFeePercent) / 100)
    
    // Create revenue tracking entry
    await supabase.from('revenue_tracking').insert({
      game_id: gameId,
      player_id: playerId,
      entry_fee: entryFeeAmount,
      platform_fee_percentage: parseFloat(platformFeePercent),
      platform_fee_amount: platformFeeAmount
    })
    
    return true
  } catch (error) {
    console.error('Error tracking revenue:', error)
    return false
  }
}

export const getRevenueStats = async () => {
  try {
    const { data: revenue } = await supabase
      .from('revenue_tracking')
      .select('*')
    
    const today = new Date().toISOString().split('T')[0]
    const todayRevenue = revenue
      ?.filter((r: any) => r.transaction_date?.startsWith(today))
      .reduce((sum: number, r: any) => sum + (r.entry_fee || 0), 0) || 0
    
    const totalRevenue = revenue
      ?.reduce((sum: number, r: any) => sum + (r.entry_fee || 0), 0) || 0
    
    const platformRevenue = revenue
      ?.reduce((sum: number, r: any) => sum + (r.platform_fee_amount || 0), 0) || 0
    
    return {
      todayRevenue,
      totalRevenue,
      platformRevenue,
      totalTransactions: revenue?.length || 0
    }
  } catch (error) {
    console.error('Error getting revenue stats:', error)
    return {
      todayRevenue: 0,
      totalRevenue: 0,
      platformRevenue: 0,
      totalTransactions: 0
    }
  }
}