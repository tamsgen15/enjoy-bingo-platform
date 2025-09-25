'use client'

import { useState, useEffect } from 'react'

interface TenantCardPreviewProps {
  cardNumber: number
  tenantId?: string
  className?: string
}

export default function TenantCardPreview({ cardNumber, tenantId, className = "" }: TenantCardPreviewProps) {
  const [cardData, setCardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchCard = async () => {
      try {
        const response = await fetch(`/api/bingo-cards/${cardNumber}`)
        if (response.ok) {
          const data = await response.json()
          setCardData({
            b: data.b_column,
            i: data.i_column,
            n: [...data.n_column.slice(0, 2), 'FREE', ...data.n_column.slice(2)],
            g: data.g_column,
            o: data.o_column
          })
        }
      } catch (error) {
        console.error('Error fetching tenant card:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCard()
  }, [cardNumber])

  if (loading) return <div className="text-white text-xs">Loading...</div>
  if (!cardData) return <div className="text-white text-xs">Card #{cardNumber}</div>

  return (
    <div className={`border-2 rounded-lg p-4 bg-white shadow-lg w-fit ${className}`}>
      <div className="text-center text-lg font-bold mb-3 text-gray-800">
        Card #{cardNumber}
        {tenantId && <div className="text-xs text-gray-500">Tenant: {tenantId.slice(0, 8)}...</div>}
      </div>
      <div className="grid grid-cols-5 gap-1">
        <div className="font-bold text-center bg-sky-400 text-white w-10 h-8 rounded flex items-center justify-center text-sm">B</div>
        <div className="font-bold text-center bg-red-500 text-white w-10 h-8 rounded flex items-center justify-center text-sm">I</div>
        <div className="font-bold text-center bg-yellow-500 text-white w-10 h-8 rounded flex items-center justify-center text-sm">N</div>
        <div className="font-bold text-center bg-green-500 text-white w-10 h-8 rounded flex items-center justify-center text-sm">G</div>
        <div className="font-bold text-center bg-orange-500 text-white w-10 h-8 rounded flex items-center justify-center text-sm">O</div>
        
        {[0,1,2,3,4].map(row => 
          [cardData.b[row], cardData.i[row], cardData.n[row], cardData.g[row], cardData.o[row]].map((num, col) => (
            <div key={`${row}-${col}`} className={`text-center w-10 h-8 border-2 border-gray-300 rounded flex items-center justify-center text-sm font-medium ${
              num === 'FREE' ? 'bg-yellow-200 font-bold text-yellow-800' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              {num === 'FREE' ? '★' : num}
            </div>
          ))
        )}
      </div>
    </div>
  )
}