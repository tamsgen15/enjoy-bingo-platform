// Free eSpeak TTS for Amharic using speak.js
export class ESpeakTTS {
  private speakJS: any = null

  constructor() {
    this.loadSpeakJS()
  }

  private async loadSpeakJS() {
    try {
      // Load speak.js from CDN
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/gh/kripken/speak.js@master/speakClient.js'
      script.onload = () => {
        this.speakJS = (window as any).speakClient
        console.log('eSpeak loaded successfully')
      }
      document.head.appendChild(script)
    } catch (error) {
      console.error('Failed to load eSpeak:', error)
    }
  }

  speak(text: string) {
    if (this.speakJS) {
      this.speakJS({
        text: text,
        voice: 'en', // eSpeak doesn't have native Amharic, uses English
        speed: 120,
        pitch: 50,
        amplitude: 100
      })
    } else {
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.5
      utterance.pitch = 0.9
      speechSynthesis.speak(utterance)
    }
  }
}