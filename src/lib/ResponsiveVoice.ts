// Free ResponsiveVoice TTS (no API key needed for basic use)
export class ResponsiveVoiceTTS {
  private loaded = false

  constructor() {
    this.loadResponsiveVoice()
  }

  private loadResponsiveVoice() {
    const script = document.createElement('script')
    script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=FREE'
    script.onload = () => {
      this.loaded = true
      console.log('ResponsiveVoice loaded')
    }
    document.head.appendChild(script)
  }

  speak(text: string) {
    if (this.loaded && (window as any).responsiveVoice) {
      (window as any).responsiveVoice.speak(text, 'US English Male', {
        rate: 0.8,
        pitch: 1,
        volume: 1
      })
    } else {
      // Fallback to browser speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }
}