// Amharic voice announcements for bingo game
export class AmharicVoice {
  private synth: SpeechSynthesis
  private voice: SpeechSynthesisVoice | null = null

  constructor() {
    this.synth = window.speechSynthesis
    this.initVoice()
  }

  private initVoice() {
    const setVoices = () => {
      const voices = this.synth.getVoices()
      // Use default voice for now
      this.voice = voices[0] || null
      console.log('Available voices:', voices.length)
    }
    
    if (this.synth.getVoices().length > 0) {
      setVoices()
    } else {
      this.synth.onvoiceschanged = setVoices
    }
  }

  private speak(text: string) {
    console.log('Speaking text')
    
    // Cancel any ongoing speech
    this.synth.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.5 // Slower, more professional
    utterance.pitch = 0.9 // Slightly lower pitch
    utterance.volume = 1
    // Try Amharic first, fallback to English
    utterance.lang = 'am-ET'
    
    // Find Amharic or fallback to professional voice
    const voices = this.synth.getVoices()
    const amharicVoice = voices.find(v => 
      v.lang.includes('am') || 
      v.lang.includes('et') ||
      v.name.toLowerCase().includes('amharic')
    )
    
    const professionalVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Microsoft') ||
      v.name.includes('Alex') ||
      v.name.includes('Daniel')
    )
    
    if (amharicVoice) {
      utterance.voice = amharicVoice
      console.log('Using Amharic voice:', amharicVoice.name)
    } else if (professionalVoice) {
      utterance.voice = professionalVoice
      console.log('Using professional voice for Amharic:', professionalVoice.name)
    }
    
    this.synth.speak(utterance)
  }

  announceGameStart() {
    this.speak("ጨዋታው ተጀምሯል") // "The game has started" in Amharic
  }

  announceNumber(number: number) {
    const letter = this.getBingoLetter(number)
    const amharicNumber = this.getAmharicNumber(number)
    
    // Add pauses for more professional delivery in Amharic
    this.speak(`${letter}... ${amharicNumber}`)
  }
  
  private getEnglishLetter(number: number): string {
    if (number >= 1 && number <= 15) return 'B'
    if (number >= 16 && number <= 30) return 'I'  
    if (number >= 31 && number <= 45) return 'N'
    if (number >= 46 && number <= 60) return 'G'
    if (number >= 61 && number <= 75) return 'O'
    return ''
  }

  private getBingoLetter(number: number): string {
    if (number >= 1 && number <= 15) return 'ቢ' // B
    if (number >= 16 && number <= 30) return 'አይ' // I  
    if (number >= 31 && number <= 45) return 'ኤን' // N
    if (number >= 46 && number <= 60) return 'ጂ' // G
    if (number >= 61 && number <= 75) return 'ኦ' // O
    return ''
  }

  private getAmharicNumber(number: number): string {
    const amharicNumbers: { [key: number]: string } = {
      1: 'አንድ', 2: 'ሁለት', 3: 'ሶስት', 4: 'አራት', 5: 'አምስት',
      6: 'ስድስት', 7: 'ሰባት', 8: 'ስምንት', 9: 'ዘጠኝ', 10: 'አስር',
      11: 'አስራ አንድ', 12: 'አስራ ሁለት', 13: 'አስራ ሶስት', 14: 'አስራ አራት', 15: 'አስራ አምስት',
      16: 'አስራ ስድስት', 17: 'አስራ ሰባት', 18: 'አስራ ስምንት', 19: 'አስራ ዘጠኝ', 20: 'ሃያ',
      21: 'ሃያ አንድ', 22: 'ሃያ ሁለት', 23: 'ሃያ ሶስት', 24: 'ሃያ አራት', 25: 'ሃያ አምስት',
      26: 'ሃያ ስድስት', 27: 'ሃያ ሰባት', 28: 'ሃያ ስምንት', 29: 'ሃያ ዘጠኝ', 30: 'ሰላሳ',
      31: 'ሰላሳ አንድ', 32: 'ሰላሳ ሁለት', 33: 'ሰላሳ ሶስት', 34: 'ሰላሳ አራት', 35: 'ሰላሳ አምስት',
      36: 'ሰላሳ ስድስት', 37: 'ሰላሳ ሰባት', 38: 'ሰላሳ ስምንት', 39: 'ሰላሳ ዘጠኝ', 40: 'አርባ',
      41: 'አርባ አንድ', 42: 'አርባ ሁለት', 43: 'አርባ ሶስት', 44: 'አርባ አራት', 45: 'አርባ አምስት',
      46: 'አርባ ስድስት', 47: 'አርባ ሰባት', 48: 'አርባ ስምንት', 49: 'አርባ ዘጠኝ', 50: 'ሃምሳ',
      51: 'ሃምሳ አንድ', 52: 'ሃምሳ ሁለት', 53: 'ሃምሳ ሶስት', 54: 'ሃምሳ አራት', 55: 'ሃምሳ አምስት',
      56: 'ሃምሳ ስድስት', 57: 'ሃምሳ ሰባት', 58: 'ሃምሳ ስምንት', 59: 'ሃምሳ ዘጠኝ', 60: 'ስድሳ',
      61: 'ስድሳ አንድ', 62: 'ስድሳ ሁለት', 63: 'ስድሳ ሶስት', 64: 'ስድሳ አራት', 65: 'ስድሳ አምስት',
      66: 'ስድሳ ስድስት', 67: 'ስድሳ ሰባት', 68: 'ስድሳ ስምንት', 69: 'ስድሳ ዘጠኝ', 70: 'ሰባ',
      71: 'ሰባ አንድ', 72: 'ሰባ ሁለት', 73: 'ሰባ ሶስት', 74: 'ሰባ አራት', 75: 'ሰባ አምስት'
    }
    
    return amharicNumbers[number] || number.toString()
  }
}