/**
 * Tenant Audio Manager - Singleton for clean audio playback
 * Prevents overlapping and echoing audio
 */

class TenantAudioManager {
  private static instance: TenantAudioManager
  private currentAudio: HTMLAudioElement | null = null
  private audioCache: Map<number, HTMLAudioElement> = new Map()
  private isPlaying = false
  private tenantId: string | null = null

  static getInstance(): TenantAudioManager {
    if (!TenantAudioManager.instance) {
      TenantAudioManager.instance = new TenantAudioManager()
    }
    return TenantAudioManager.instance
  }

  /**
   * Set current tenant for audio isolation
   */
  setTenant(tenantId: string): void {
    this.tenantId = tenantId
  }

  /**
   * Preload audio files for better performance
   */
  async preloadAudio(): Promise<void> {
    console.log('🎵 Preloading Amharic audio files...')
    
    // Preload letters (lowercase filenames)
    const letters = ['b', 'i', 'n', 'g', 'o']
    for (const letter of letters) {
      try {
        const audio = new Audio(`/audio/amharic/${letter}.mp3`)
        audio.preload = 'auto'
        audio.volume = 0.7
      } catch (error) {
        console.warn(`Failed to preload letter ${letter}:`, error)
      }
    }
    
    // Preload numbers
    for (let i = 1; i <= 75; i++) {
      try {
        const audio = new Audio(`/audio/amharic/${i}.mp3`)
        audio.preload = 'auto'
        audio.volume = 0.7
        this.audioCache.set(i, audio)
      } catch (error) {
        console.warn(`Failed to preload audio ${i}:`, error)
      }
    }
    
    // Preload game started announcement
    try {
      const gameStartAudio = new Audio('/audio/amharic/game-started.mp3')
      gameStartAudio.preload = 'auto'
      gameStartAudio.volume = 0.8
    } catch (error) {
      console.warn('Failed to preload game-started audio:', error)
    }
    
    console.log('🎵 Audio preloading completed (letters + numbers + game-started)')
  }

  /**
   * Play number with letter audio (singleton - prevents overlapping)
   */
  async playNumber(number: number, forTenant?: string): Promise<void> {
    // Only play if this is for our tenant or no tenant specified
    if (forTenant && this.tenantId && forTenant !== this.tenantId) {
      return
    }

    // Prevent multiple simultaneous plays
    if (this.isPlaying) {
      return
    }

    try {
      // Play only the number (no letter to avoid duplicates)
      await this.playSequence([
        `/audio/amharic/${number}.mp3`
      ])
      
    } catch (error) {
      console.log('Audio play failed:', error)
      this.isPlaying = false
      this.currentAudio = null
    }
  }

  /**
   * Play letter audio only (single call)
   */
  async playLetter(letter: string, forTenant?: string): Promise<void> {
    // Only play if this is for our tenant or no tenant specified
    if (forTenant && this.tenantId && forTenant !== this.tenantId) {
      return
    }

    // Prevent multiple simultaneous plays
    if (this.isPlaying) {
      return
    }

    try {
      const audio = new Audio(`/audio/amharic/${letter}.mp3`)
      audio.volume = 0.7
      this.currentAudio = audio
      this.isPlaying = true
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          this.isPlaying = false
          this.currentAudio = null
          resolve()
        }
        audio.onerror = () => {
          this.isPlaying = false
          this.currentAudio = null
          reject(new Error('Audio failed'))
        }
        audio.play().catch(reject)
      })
    } catch (error) {
      console.log('Letter audio play failed:', error)
      this.isPlaying = false
      this.currentAudio = null
    }
  }

  /**
   * Get BINGO letter for number (lowercase for file paths)
   */
  private getLetterForNumber(number: number): string {
    if (number <= 15) return 'b'
    if (number <= 30) return 'i'
    if (number <= 45) return 'n'
    if (number <= 60) return 'g'
    return 'o'
  }

  /**
   * Play audio sequence (letter then number)
   */
  private async playSequence(audioFiles: string[]): Promise<void> {
    this.isPlaying = true
    
    for (const audioFile of audioFiles) {
      try {
        const audio = new Audio(audioFile)
        audio.volume = 0.7
        this.currentAudio = audio
        
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('Audio failed'))
          audio.play().catch(reject)
        })
        
        // Small pause between letter and number
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.log(`Audio failed for ${audioFile}:`, error)
      }
    }
    
    this.isPlaying = false
    this.currentAudio = null
  }

  /**
   * Play game start announcement
   */
  async playGameStart(): Promise<void> {
    this.stopCurrent()
    
    try {
      // Play primary Amharic game start audio
      const audio = new Audio('/audio/amharic/game-started.mp3')
      audio.volume = 0.8
      this.currentAudio = audio
      this.isPlaying = true
      
      await audio.play()
      console.log('🎵 Game started - game-started.mp3 played')
      
      // Auto-clear after audio ends
      setTimeout(() => {
        this.isPlaying = false
        this.currentAudio = null
      }, 3000)
      
    } catch (error) {
      console.log('🎵 Game started - Amharic audio file missing, please add game-started.mp3')
      this.isPlaying = false
      this.currentAudio = null
    }
  }



  /**
   * Stop currently playing audio
   */
  stopCurrent(): void {
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
      this.isPlaying = false
    }
  }

  /**
   * Check if audio is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Clear all cached audio
   */
  clearCache(): void {
    this.stopCurrent()
    this.audioCache.clear()
  }
}

export const tenantAudioManager = TenantAudioManager.getInstance()

// Setup and cleanup functions for React components
export function setupAudioManager(): TenantAudioManager {
  return tenantAudioManager
}

export function cleanupAudioManager(manager: TenantAudioManager): void {
  manager.stopCurrent()
  manager.clearCache()
}