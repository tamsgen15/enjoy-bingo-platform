// Offline Amharic TTS using pre-recorded audio files
export class OfflineAmharicTTS {
  private audioCache: { [key: string]: HTMLAudioElement } = {}

  constructor() {
    this.audioCache = {}
    if (typeof window !== 'undefined') {
      this.preloadAudio()
    }
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
  }

  async speak(text: string) {
    if (typeof window === 'undefined') return
    
    if (text === 'Game Started') {
      this.playAudio('game-started')
      return
    }

    const match = text.match(/([BINGO])\s+(\d+)/)
    if (match) {
      const [, letter, number] = match
      await this.playAudio(letter.toLowerCase())
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.playAudio(number)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    speechSynthesis.speak(utterance)
  }

  private async playAudio(key: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve()
    
    return new Promise((resolve) => {
      const audio = this.audioCache[key]
      if (audio) {
        try {
          audio.currentTime = 0
          audio.volume = 0.9
          audio.onended = () => resolve()
          audio.onerror = () => resolve()
          audio.play().catch(() => resolve())
        } catch (error) {
          console.error(`Failed to play audio: ${key}`, error)
          resolve()
        }
      } else {
        console.warn(`Audio file not found: ${key}`)
        resolve()
      }
    })
  }
}