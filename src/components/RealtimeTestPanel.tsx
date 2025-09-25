'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface RealtimeTestPanelProps {
  gameId: string
  tenantId?: string | null
}

export default function RealtimeTestPanel({ gameId, tenantId }: RealtimeTestPanelProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testAction = async (action: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/realtime-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, action, tenantId })
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg border-white/20 border rounded-lg p-4">
      <h3 className="text-white font-semibold mb-4">🧪 Real-time Test Panel</h3>
      
      <div className="space-y-2 mb-4">
        <Button
          onClick={() => testAction('call_number')}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          {loading ? 'Testing...' : '🎲 Test Call Number'}
        </Button>
        
        <Button
          onClick={() => testAction('get_status')}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
        >
          {loading ? 'Testing...' : '📊 Test Get Status'}
        </Button>
        
        <Button
          onClick={() => testAction('reset_game')}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
        >
          {loading ? 'Testing...' : '🔄 Test Reset Game'}
        </Button>
      </div>

      {result && (
        <div className="bg-black/30 rounded p-3">
          <div className="text-white/70 text-xs mb-1">Test Result:</div>
          <pre className="text-white text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}