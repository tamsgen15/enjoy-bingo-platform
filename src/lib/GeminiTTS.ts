// Google Gemini AI for Amharic TTS (Free tier available)
export class GeminiTTS {
  private apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY'
  private audioContext: AudioContext | null = null

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  async speak(text: string) {
    try {
      // Use Gemini to generate audio pronunciation guide
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Convert this Amharic text to phonetic pronunciation for English TTS: "${text}". Return only the phonetic spelling.`
            }]
          }]
        })
      })

      const data = await response.json()
      const phoneticText = data.candidates?.[0]?.content?.parts?.[0]?.text || text

      // Use browser TTS with phonetic pronunciation
      const utterance = new SpeechSynthesisUtterance(phoneticText)
      utterance.rate = 0.7
      utterance.pitch = 0.9
      utterance.volume = 1
      
      speechSynthesis.speak(utterance)
      
    } catch (error) {
      console.error('Gemini TTS error:', error)
      // Fallback to direct text
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.7
      speechSynthesis.speak(utterance)
    }
  }
}