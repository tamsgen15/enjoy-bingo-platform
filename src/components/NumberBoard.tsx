'use client'

interface NumberBoardProps {
  calledNumbers: number[]
  currentNumber: number | null
}

export default function NumberBoard({ calledNumbers, currentNumber }: NumberBoardProps) {
  const bNumbers = Array.from({ length: 15 }, (_, i) => i + 1)
  const iNumbers = Array.from({ length: 15 }, (_, i) => i + 16)
  const nNumbers = Array.from({ length: 15 }, (_, i) => i + 31)
  const gNumbers = Array.from({ length: 15 }, (_, i) => i + 46)
  const oNumbers = Array.from({ length: 15 }, (_, i) => i + 61)

  const getNumberStatus = (num: number) => {
    if (num === currentNumber) return 'current'
    if (calledNumbers.includes(num)) return 'called'
    return 'pending'
  }

  const getNumberStyle = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-red-500 text-white animate-pulse scale-110'
      case 'called':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-200 text-gray-700'
    }
  }

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

  const renderRow = (letter: string, numbers: number[]) => (
    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 w-full">
      <div className={`font-black text-xs sm:text-lg w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center rounded-full shadow-lg flex-shrink-0 ${getHeaderColor(letter)}`}>
        {letter}
      </div>
      <div className="flex gap-0.5 sm:gap-2 flex-1 justify-between">
        {numbers.map((num) => {
          const status = getNumberStatus(num)
          return (
            <div
              key={num}
              className={`w-4 h-4 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold rounded transition-all duration-200 ${getNumberStyle(status)}`}
            >
              {num}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="w-full p-2 sm:p-4">
      {renderRow('B', bNumbers)}
      {renderRow('I', iNumbers)}
      {renderRow('N', nNumbers)}
      {renderRow('G', gNumbers)}
      {renderRow('O', oNumbers)}
    </div>
  )
}