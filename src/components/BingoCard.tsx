interface BingoCardProps {
  card: any
  markedNumbers: number[]
  calledNumbers: number[]
  onMarkNumber: (number: number) => void
}

export default function BingoCardComponent({ 
  card, 
  markedNumbers, 
  calledNumbers, 
  onMarkNumber 
}: BingoCardProps) {
  const columns = [
    { letter: 'B', numbers: card.b, bgColor: 'bg-sky-400' },
    { letter: 'I', numbers: card.i, bgColor: 'bg-red-500' },
    { letter: 'N', numbers: card.n, bgColor: 'bg-yellow-500' },
    { letter: 'G', numbers: card.g, bgColor: 'bg-green-500' },
    { letter: 'O', numbers: card.o, bgColor: 'bg-orange-500' }
  ]

  return (
    <div className="bingo-card">
      {/* Header */}
      {columns.map((col) => (
        <div key={col.letter} className={`text-center font-bold text-lg w-12 h-12 rounded-full flex items-center justify-center text-white ${col.bgColor}`}>
          {col.letter}
        </div>
      ))}
      
      {/* Numbers */}
      {[0, 1, 2, 3, 4].map((row) => (
        columns.map((col, colIndex) => {
          // Free space in center
          if (colIndex === 2 && row === 2) {
            return (
              <div key={`${col.letter}-${row}`} className="bingo-cell free">
                FREE
              </div>
            )
          }
          
          const number = col.numbers[row]
          const isMarked = markedNumbers.includes(number)
          const isCalled = calledNumbers.includes(number)
          
          return (
            <div
              key={`${col.letter}-${row}`}
              className={`bingo-cell ${isMarked ? 'marked' : ''} ${isCalled ? 'border-green-500 border-2' : ''}`}
              onClick={() => isCalled && onMarkNumber(number)}
            >
              {number}
            </div>
          )
        })
      ))}
    </div>
  )
}