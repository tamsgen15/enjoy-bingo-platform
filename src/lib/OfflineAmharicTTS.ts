// Offline Amharic TTS using pre-recorded audio files
export class OfflineAmharicTTS {
  private static instance: OfflineAmharicTTS | null = null
  private audioCache: { [key: string]: HTMLAudioElement } = {}
  private isPlaying = false
  private isSpeaking = false

  private constructor() {
    this.audioCache = {}
    if (typeof window !== 'undefined') {
      this.preloadAudio()
    }
  }

  static getInstance(): OfflineAmharicTTS {
    if (!OfflineAmharicTTS.instance) {
      OfflineAmharicTTS.instance = new OfflineAmharicTTS()
    }
    return OfflineAmharicTTS.instance
  }

  private preloadAudio() {
    if (typeof window === 'undefined') return
    
    const phrases = [
      'game-started',
      'b', 'i', 'n', 'g', 'o',
      ...Array.from({length: 75}, (_, i) => (i + 1).toString())
    ]

    phrases.forEach(phrase => {
      const audio = new Audio(`/audio/amharic/${phrase}.mp3?v=${Date.now()}`)
      audio.preload = 'auto'
      audio.volume = 0.9
      audio.load()
      this.audioCache[phrase] = audio
    })
    
    console.log(`Preloaded ${phrases.length} Amharic audio files`)
    
    // Test audio loading
    setTimeout(() => {
      const testAudio = this.audioCache['1']
      if (testAudio) {
        console.log('Audio files loaded successfully')
      } else {
        console.warn('Audio files may not be loaded properly')
      }
    }, 1000)
  }

  async speak(text: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve()
    
    // Prevent overlapping speech
    if (this.isSpeaking || this.isPlaying) {
      console.log(`⚠️ TTS: Speech in progress, waiting for: ${text}`)
      // Wait for current speech to finish
      while (this.isSpeaking || this.isPlaying) {
        await new Promise(r => setTimeout(r, 100))
      }
    }
    
    this.isSpeaking = true
    console.log(`🎤 TTS: Starting synchronized speech: ${text}`)
    
    try {
      if (text === 'Game Started') {
        await this.playAudio('game-started')
        return
      }

      const match = text.match(/([BINGO])\s+(\d+)/)
      if (match) {
        const [, letter, number] = match
        console.log(`🎤 TTS: Synchronized playback ${letter}-${number}`)
        
        // Play letter
        await this.playAudio(letter.toLowerCase())
        
        // Synchronized gap between letter and number
        console.log(`⏸️ TTS: 600ms synchronized gap`)
        await new Promise(r => setTimeout(r, 600))
        
        // Play number
        await this.playAudio(number)
        
        console.log(`✅ TTS: Synchronized completion ${letter} ${number}`)
        return
      }

      // Fallback to speech synthesis
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      speechSynthesis.speak(utterance)
      
      // Wait for synthesis to complete
      await new Promise(resolve => {
        utterance.onend = () => resolve(void 0)
        utterance.onerror = () => resolve(void 0)
      })
      
    } catch (error) {
      console.error('Error in synchronized speak:', error)
    } finally {
      this.isSpeaking = false
      console.log(`🏁 TTS: Speech cycle completed for: ${text}`)
    }
  }



  private async playAudio(key: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve()
    
    return new Promise((resolve) => {
      const audio = this.audioCache[key]
      if (audio) {
        try {
          // Ensure clean audio state
          audio.pause()
          audio.currentTime = 0
          audio.volume = 0.9
          
          console.log(`🔊 Synchronized audio: ${key}`)
          
          const onEnd = () => {
            console.log(`✅ Audio sync completed: ${key}`)
            this.isPlaying = false
            audio.removeEventListener('ended', onEnd)
            audio.removeEventListener('error', onError)
            // Small buffer time for perfect sync
            setTimeout(resolve, 50)
          }
          
          const onError = () => {
            console.log(`❌ Audio sync error: ${key}`)
            this.isPlaying = false
            audio.removeEventListener('ended', onEnd)
            audio.removeEventListener('error', onError)
            resolve()
          }
          
          audio.addEventListener('ended', onEnd)
          audio.addEventListener('error', onError)
          
          this.isPlaying = true
          audio.play().catch(onError)
          
        } catch (error) {
          console.error(`Sync audio error: ${key}`, error)
          this.isPlaying = false
          resolve()
        }
      } else {
        console.warn(`Sync audio missing: ${key}`)
        // Maintain timing even when audio is missing
        setTimeout(resolve, 500)
      }
    })
  }

  /**
   * Stop all currently playing audio
   */
  private stopAllAudio(): void {
    Object.values(this.audioCache).forEach(audio => {
      try {
        if (!audio.paused) {
          audio.pause()
          audio.currentTime = 0
        }
      } catch (error) {
        // Ignore errors when stopping audio
      }
    })
    this.isPlaying = false
  }

  /**
   * Public method to stop all audio
   */
  stopAll(): void {
    this.stopAllAudio()
    this.isSpeaking = false
  }

  /**
   * Check if audio is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying
  }
}