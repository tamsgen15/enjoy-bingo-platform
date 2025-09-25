/**
 * Tenant-Aware Automatic Number Caller
 * Each tenant has isolated number calling system
 */

import { databaseService } from './databaseService'

interface TenantGameSession {
  gameId: string
  tenantId: string
  intervalId: NodeJS.Timeout | null
  isActive: boolean
  isPaused: boolean
  callCount: number
}

class TenantAutomaticNumberCaller {
  private static instance: TenantAutomaticNumberCaller
  private tenantSessions: Map<string, TenantGameSession> = new Map()
  private readonly CALL_INTERVAL = 6000 // 6 seconds

  static getInstance(): TenantAutomaticNumberCaller {
    if (!TenantAutomaticNumberCaller.instance) {
      TenantAutomaticNumberCaller.instance = new TenantAutomaticNumberCaller()
    }
    return TenantAutomaticNumberCaller.instance
  }

  /**
   * Start automatic calling for a specific tenant game
   */
  startTenantGame(gameId: string, tenantId: string): void {
    const sessionKey = `${tenantId}-${gameId}`
    
    // Stop existing session for this tenant
    this.stopTenantGame(tenantId)
    
    console.log(`🎯 Starting tenant caller: ${tenantId.slice(0, 8)}... game: ${gameId.slice(0, 8)}...`)
    
    const session: TenantGameSession = {
      gameId,
      tenantId,
      intervalId: null,
      isActive: true,
      isPaused: false,
      callCount: 0
    }
    
    session.intervalId = setInterval(async () => {
      if (!session.isPaused && session.isActive) {
        await this.callNextNumberForTenant(session)
      }
    }, this.CALL_INTERVAL)
    
    this.tenantSessions.set(sessionKey, session)
  }

  /**
   * Pause automatic calling for a specific tenant
   */
  pauseTenantGame(tenantId: string): void {
    const session = this.findTenantSession(tenantId)
    if (session) {
      session.isPaused = true
      console.log(`⏸️ Paused tenant caller: ${tenantId.slice(0, 8)}...`)
    }
  }

  /**
   * Resume automatic calling for a specific tenant
   */
  resumeTenantGame(tenantId: string): void {
    const session = this.findTenantSession(tenantId)
    if (session) {
      session.isPaused = false
      console.log(`▶️ Resumed tenant caller: ${tenantId.slice(0, 8)}...`)
    }
  }

  /**
   * Stop automatic calling for a specific tenant
   */
  stopTenantGame(tenantId: string): void {
    const session = this.findTenantSession(tenantId)
    if (session) {
      if (session.intervalId) {
        clearInterval(session.intervalId)
      }
      session.isActive = false
      
      // Remove from sessions
      const sessionKey = `${tenantId}-${session.gameId}`
      this.tenantSessions.delete(sessionKey)
      
      console.log(`🛑 Stopped tenant caller: ${tenantId.slice(0, 8)}...`)
    }
  }

  /**
   * Check if tenant has active caller
   */
  isTenantGameActive(tenantId: string): boolean {
    const session = this.findTenantSession(tenantId)
    return session ? session.isActive && !session.isPaused : false
  }

  /**
   * Get tenant session status
   */
  getTenantStatus(tenantId: string): {
    active: boolean
    paused: boolean
    gameId?: string
    callCount: number
  } {
    const session = this.findTenantSession(tenantId)
    if (!session) {
      return { active: false, paused: false, callCount: 0 }
    }
    
    return {
      active: session.isActive,
      paused: session.isPaused,
      gameId: session.gameId,
      callCount: session.callCount
    }
  }

  /**
   * Find active session for tenant
   */
  private findTenantSession(tenantId: string): TenantGameSession | undefined {
    for (const session of Array.from(this.tenantSessions.values())) {
      if (session.tenantId === tenantId && session.isActive) {
        return session
      }
    }
    return undefined
  }

  /**
   * Call next number for specific tenant
   */
  private async callNextNumberForTenant(session: TenantGameSession): Promise<void> {
    try {
      const result = await databaseService.callNextNumber(session.gameId, session.tenantId)
      
      if (result.success && result.number) {
        session.callCount++
        console.log(`📢 Tenant ${session.tenantId.slice(0, 8)}... called: ${result.letter}${result.number} (${session.callCount})`)
        
        // Play audio for the called number with letter (ensure lowercase)
        this.playNumberAudio(result.number, result.letter?.toLowerCase())
        
      } else if (result.error?.includes('All numbers called') || result.error?.includes('Game not found')) {
        console.log(`🏁 Tenant ${session.tenantId.slice(0, 8)}... game completed`)
        this.stopTenantGame(session.tenantId)
      }
    } catch (error) {
      console.error(`❌ Tenant ${session.tenantId.slice(0, 8)}... call error:`, error)
    }
  }

  /**
   * Stop all tenant sessions (cleanup)
   */
  stopAllTenants(): void {
    console.log('🧹 Stopping all tenant callers')
    for (const [key, session] of this.tenantSessions) {
      if (session.intervalId) {
        clearInterval(session.intervalId)
      }
    }
    this.tenantSessions.clear()
  }

  /**
   * Play audio for called number with letter using singleton manager
   */
  private async playNumberAudio(number: number, letter?: string): Promise<void> {
    try {
      const { tenantAudioManager } = await import('./TenantAudioManager')
      const activeTenants = this.getActiveTenants()
      const tenantId = activeTenants.length > 0 ? activeTenants[0] : undefined
      
      // Single call to play letter+number sequence
      await tenantAudioManager.playLetterNumberSequence(letter || '', number, tenantId)
    } catch (error) {
      console.log('Audio manager not available:', error)
    }
  }

  /**
   * Get all active tenant sessions
   */
  getActiveTenants(): string[] {
    const activeTenants: string[] = []
    for (const [key, session] of this.tenantSessions) {
      if (session.isActive) {
        activeTenants.push(session.tenantId)
      }
    }
    return activeTenants
  }
}

export const tenantAutomaticNumberCaller = TenantAutomaticNumberCaller.getInstance()