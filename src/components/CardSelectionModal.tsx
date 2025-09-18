'use client'

import { useState, useEffect } from 'react'
import { useRealtimeGame } from '@/lib/RealtimeGameContext'

interface CardSelectionModalProps {
  gameId: string
  onClose: () => void
  onAssign: (playerName: string, cardNumber: number) => void
}

export default function CardSelectionModal({ gameId, onClose, onAssign }: CardSelectionModalProps) {
  const { players } = useRealtimeGame()
  const [playerName, setPlayerName] = useState('')
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [cardData, setCardData] = useState<any>(null)
  
  // Get taken cards from existing players
  const takenCards = players.map(player => player.selected_card_number)

  // Fetch real bingo card from database
  useEffect(() => {
    if (selectedCard) {
      const fetchCard = async () => {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('bingo_cards')
          .select('*')
          .eq('card_number', selectedCard)
          .single()
        
        if (data) {
          setCardData({
            b: data.b_column,
            i: data.i_column,
            n: [...data.n_column.slice(0, 2), 'FREE', ...data.n_column.slice(2)],
            g: data.g_column,
            o: data.o_column
          })
        }
      }
      fetchCard()
    }
  }, [selectedCard])



  const handleAssign = () => {
    if (!playerName.trim() || !selectedCard) return

    onAssign(playerName, selectedCard)
    setPlayerName('')
    setSelectedCard(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-center flex-1 text-white">🃏 Assign Bingo Card</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">✕</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-white">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter player name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-white">Select Card Number (1-100)</label>
          <div className="flex gap-6">
            <div className="grid grid-cols-10 gap-1 p-2 border rounded w-fit">
              {Array.from({ length: 100 }, (_, i) => i + 1).map(cardNum => {
                const isTaken = takenCards.includes(cardNum)
                const isSelected = selectedCard === cardNum
                
                return (
                  <button
                    key={cardNum}
                    onClick={() => !isTaken && setSelectedCard(cardNum)}
                    disabled={isTaken}
                    className={`w-8 h-6 text-xs font-bold border border-gray-300 rounded mx-1 transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-600'
                        : !isTaken
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-500 text-white cursor-not-allowed'
                    }`}
                  >
                    {cardNum}
                  </button>
                )
              })}
            </div>
            
            {selectedCard && cardData && (
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Card #{selectedCard} Preview</label>
                <div className="border rounded p-2 bg-gray-50 w-fit">
                  <div className="grid grid-cols-5 gap-0.5 text-xs">
                    <div className="font-bold text-center bg-sky-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">B</div>
                    <div className="font-bold text-center bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">I</div>
                    <div className="font-bold text-center bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">N</div>
                    <div className="font-bold text-center bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">G</div>
                    <div className="font-bold text-center bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">O</div>
                    
                    {[0,1,2,3,4].map(row => 
                      [cardData.b[row], cardData.i[row], cardData.n[row], cardData.g[row], cardData.o[row]].map((num, col) => (
                        <div key={`${row}-${col}`} className={`text-center w-6 h-6 border flex items-center justify-center text-xs ${
                          num === 'FREE' ? 'bg-yellow-300 font-bold' : 'bg-gray-100'
                        }`}>
                          {num === 'FREE' ? '★' : num}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <span className="flex items-center gap-1 text-white">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              Available
            </span>
            <span className="flex items-center gap-1 text-white">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              Taken
            </span>
            <span className="flex items-center gap-1 text-white">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              Selected
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAssign}
            disabled={!playerName.trim() || !selectedCard}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💰 Assign Card (20 ETB - Manual Payment)
          </button>
          <button
            onClick={onClose}
            className="bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}