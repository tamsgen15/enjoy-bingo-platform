/**
 * Automatic Number Caller System
 * Single instance system to prevent duplicate number calling
 */

import { databaseService } from './databaseService'
import { OfflineAmharicTTS } from './OfflineAmharicTTS'

// Global state to prevent multiple instances
let globalActiveGameId: string | null = null
let globalActiveTenantId: string | null = null
let globalIsActive = false
let globalIntervalId: NodeJS.Timeout | null = null
let globalIsCallingInProgress = false

export class AutomaticNumberCaller {
  private static instance: AutomaticNumberCaller | null = null
  private voiceTTS: OfflineAmharicTTS

  private constructor() {
    this.voiceTTS = OfflineAmharicTTS.getInstance()
    console.log('🎯 AutomaticNumberCaller singleton created')
  }

  static getInstance(): AutomaticNumberCaller {
    if (!AutomaticNumberCaller.instance) {
      AutomaticNumberCaller.instance = new AutomaticNumberCaller()
    }
    return AutomaticNumberCaller.instance
  }

  /**
   * Start automatic number calling for a game
   */
  async startGame(gameId: string, tenantId?: string): Promise<void> {
    console.log(`🎯 Starting automatic caller for game: ${gameId}`)
    
    // Prevent duplicate instances
    if (globalIsActive && globalActiveGameId === gameId) {
      console.log(`⚠️ Game ${gameId} already active, ignoring duplicate start`)
      return
    }

    // Stop any existing game first
    if (globalIsActive) {
      console.log(`🛑 Stopping previous game before starting new one`)
      this.stopGame()
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Set global state
    globalActiveGameId = gameId
    globalActiveTenantId = tenantId || null
    globalIsActive = true
    globalIsCallingInProgress = false

    console.log(`🚀 Starting automatic number calling for game: ${gameId}`)

    // Announce game start
    await this.announceGameStart()

    // Start the calling loop
    this.startCallingLoop()
  }

  /**
   * Stop automatic number calling
   */
  stopGame(): void {
    console.log(`🛑 Stopping automatic number calling`)
    
    // Clear global state
    globalActiveGameId = null
    globalActiveTenantId = null
    globalIsActive = false
    globalIsCallingInProgress = false
    
    if (globalIntervalId) {
      clearInterval(globalIntervalId)
      globalIntervalId = null
    }
  }

  /**
   * Pause the game
   */
  pauseGame(): void {
    console.log('Pausing automatic number calling')
    globalIsActive = false
    
    if (globalIntervalId) {
      clearInterval(globalIntervalId)
      globalIntervalId = null
    }
  }

  /**
   * Resume the game
   */
  resumeGame(): void {
    if (!globalActiveGameId) return
    
    console.log('Resuming automatic number calling')
    globalIsActive = true
    this.startCallingLoop()
  }

  /**
   * Check if caller is active
   */
  isGameActive(): boolean {
    return globalIsActive
  }

  /**
   * Get current game ID
   */
  getCurrentGameId(): string | null {
    return globalActiveGameId
  }

  /**
   * Announce game start with synchronized timing
   */
  private async announceGameStart(): Promise<void> {
    console.log('🔊 Announcing game start')
    
    try {
      // Wait 2 seconds before announcement
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Announce game start
      await this.voiceTTS.speak('Game Started')
      console.log('✅ Game start announcement completed')
      
      // Wait 3 seconds before first number call
      await new Promise(resolve => setTimeout(resolve, 3000))
      
    } catch (error) {
      console.error('❌ Error announcing game start:', error)
      // Still wait the full duration even on error
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  /**
   * Start database-synchronized calling loop
   */
  private startCallingLoop(): void {
    if (!globalIsActive || !globalActiveGameId) return

    console.log('🔄 Starting database-synchronized calling loop')
    
    // Check every 1 second, but database enforces 6-second intervals
    globalIntervalId = setInterval(async () => {
      if (!globalIsActive || !globalActiveGameId || globalIsCallingInProgress) {
        return
      }

      await this.callNextNumber()
    }, 1000) // Check frequently, database controls timing
  }



  /**
   * Call next number with real-time database synchronization
   */
  private async callNextNumber(): Promise<void> {
    if (!globalActiveGameId || globalIsCallingInProgress || !globalIsActive) {
      return
    }

    globalIsCallingInProgress = true

    try {
      // Use real-time database function with tenant context
      const result = await databaseService.callNextNumberRealtime(globalActiveGameId, globalActiveTenantId || undefined)
      
      if (result.success && result.number) {
        const number = result.number
        const letter = result.letter || this.getLetterForNumber(number)
        
        console.log(`✅ Real-time call: ${letter}${number} (${result.total_called}/75)`)
        
        // Announce with synchronized timing
        if (globalIsActive && globalActiveGameId) {
          await this.announceNumber(letter, number)
        }
        
        // Check if game should end
        if (result.total_called && result.total_called >= 75) {
          console.log('🏁 All numbers called - stopping real-time game')
          this.stopGame()
        }
      } else if (result.wait_seconds) {
        // Database is enforcing timing - this is normal
        console.log(`⏱️ Real-time timing: wait ${result.wait_seconds}s`)
      } else if (result.error) {
        if (result.error.includes('All numbers') || result.error.includes('No available')) {
          console.log('🏁 Database confirms all numbers called')
          this.stopGame()
        } else if (!result.error.includes('already called') && 
                   !result.error.includes('Call already in progress') &&
                   !result.error.includes('Game not active')) {
          console.error('❌ Real-time sync error:', result.error)
        }
      }
    } catch (error) {
      console.error('❌ Error in real-time call:', error)
    } finally {
      globalIsCallingInProgress = false
    }
  }

  /**
   * Announce number with synchronized timing
   */
  private async announceNumber(letter: string, number: number): Promise<void> {
    console.log(`🔊 Announcing: ${letter} ${number}`)
    
    try {
      // Small delay before announcement for consistency
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Announce the number
      await this.voiceTTS.speak(`${letter} ${number}`)
      
      // Wait for announcement to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log(`✅ Announcement synchronized: ${letter} ${number}`)
    } catch (error) {
      console.error('❌ Error announcing number:', error)
      // Maintain timing even on error
      await new Promise(resolve => setTimeout(resolve, 1500))
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
   * Get current status
   */
  getStatus(): {
    isActive: boolean
    gameId: string | null
    isCallingInProgress: boolean
  } {
    return {
      isActive: globalIsActive,
      gameId: globalActiveGameId,
      isCallingInProgress: globalIsCallingInProgress
    }
  }
}

// Export singleton instance
export const automaticNumberCaller = AutomaticNumberCaller.getInstance()