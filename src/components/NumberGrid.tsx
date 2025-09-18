interface NumberGridProps {
  selectedCards?: number[]
  onCardSelect?: (cardNumber: number) => void
  playerName?: string
}

export default function NumberGrid({ 
  selectedCards = [], 
  onCardSelect,
  playerName
}: NumberGridProps) {
  const bNumbers = Array.from({ length: 15 }, (_, i) => i + 1)
  const iNumbers = Array.from({ length: 15 }, (_, i) => i + 16)
  const nNumbers = Array.from({ length: 15 }, (_, i) => i + 31)
  const gNumbers = Array.from({ length: 15 }, (_, i) => i + 46)
  const oNumbers = Array.from({ length: 15 }, (_, i) => i + 61)

  const getHeaderColor = (letter: string) => {
    switch(letter) {
      case 'B': return 'bg-sky-400 text-white'
      case 'I': return 'bg-red-500 text-white'
      case 'N': return 'bg-yellow-500 text-white'
      case 'G': return 'bg-green-500 text-white'
      case 'O': return 'bg-orange-500 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const renderCards = () => {
    const cards = Array.from({ length: 100 }, (_, i) => i + 1)
    
    return (
      <div className="grid grid-cols-10 gap-2">
        {cards.map((cardNumber) => {
          const isSelected = selectedCards.includes(cardNumber)
          
          return (
            <button
              key={cardNumber}
              onClick={() => onCardSelect?.(cardNumber)}
              disabled={isSelected}
              className={`w-12 h-12 rounded-lg font-bold text-sm transition-all ${
                isSelected 
                  ? 'bg-red-500/50 text-red-300 cursor-not-allowed' 
                  : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
              }`}
            >
              {cardNumber}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <p className="text-white/80 text-sm">
          Select a card number (1-100) for {playerName}
        </p>
        <p className="text-white/60 text-xs mt-1">
          Red numbers are already taken by other players
        </p>
      </div>
      {renderCards()}
    </div>
  )
}