'use client'

import { useState, useEffect } from 'react'
import { automaticNumberCaller } from '@/lib/AutomaticNumberCaller'
import { getAutoCallerStatus } from '@/lib/databaseService'
import { supabase } from '@/lib/supabase'

interface AutoCallerStatusProps {
  tenantId?: string
  gameId?: string
}

export default function AutoCallerStatus({ tenantId, gameId }: AutoCallerStatusProps) {
  const [status, setStatus] = useState(automaticNumberCaller.getStatus())
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [gameStatus, setGameStatus] = useState<string>('waiting')

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(automaticNumberCaller.getStatus())
    }, 500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!gameId || !tenantId) return
    
    const channel = supabase
      .channel(`autocaller_${tenantId}_${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        setGameStatus(payload.new.status)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'called_numbers',
        filter: `game_id=eq.${gameId}&tenant_id=eq.${tenantId}`
      }, () => {
        // Refresh status when new number is called
        if (gameId) {
          getAutoCallerStatus(gameId).then(setDbStatus)
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, tenantId])
  
  useEffect(() => {
    if (!status.isActive || !status.gameId) return

    const checkDbStatus = async () => {
      const dbStat = await getAutoCallerStatus(status.gameId!)
      setDbStatus(dbStat)
    }

    checkDbStatus()
    const dbInterval = setInterval(checkDbStatus, 1000)

    return () => clearInterval(dbInterval)
  }, [status.isActive, status.gameId])

  if (!status.isActive) {
    return null
  }

  return (
    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-center">
      <div className="text-green-400 text-xs font-medium">
        📊 Database Synchronized
      </div>
      <div className="text-white/70 text-xs">
        {status.isCallingInProgress ? 
          '🔊 Announcing...' : 
          dbStatus?.ready_to_call ? 
            '✅ Ready to call' :
            `⏱️ Next in ${dbStatus?.next_call_in || 0}s`
        }
      </div>
    </div>
  )
}