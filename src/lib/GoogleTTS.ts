// Google Cloud Text-to-Speech for Amharic
export class GoogleTTS {
  private apiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY || 'YOUR_API_KEY'

  async speak(text: string) {
    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'am-ET',
            name: 'am-ET-Standard-A'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.5,
            pitch: -2
          }
        })
      })

      const data = await response.json()
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        audio.play()
      }
    } catch (error) {
      console.error('Google TTS error:', error)
    }
  }
}