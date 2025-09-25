'use client'

import { useState, useEffect } from 'react'
import { tenantAutomaticNumberCaller } from '@/lib/TenantAutomaticNumberCaller'

interface TenantAutoCallerStatusProps {
  tenantId: string
  gameId?: string
}

export default function TenantAutoCallerStatus({ tenantId, gameId }: TenantAutoCallerStatusProps) {
  const [status, setStatus] = useState({
    active: false,
    paused: false,
    callCount: 0
  })

  useEffect(() => {
    const updateStatus = () => {
      const tenantStatus = tenantAutomaticNumberCaller.getTenantStatus(tenantId)
      setStatus(tenantStatus)
    }

    // Update immediately
    updateStatus()

    // Update every second
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [tenantId])

  if (!status.active) {
    return (
      <div className="bg-gray-600 text-white p-2 rounded text-xs text-center">
        🔴 Tenant Auto-Caller: OFF
      </div>
    )
  }

  return (
    <div className={`p-2 rounded text-xs text-center ${
      status.paused 
        ? 'bg-orange-600 text-white' 
        : 'bg-green-600 text-white animate-pulse'
    }`}>
      {status.paused ? (
        <>⏸️ Tenant Auto-Caller: PAUSED</>
      ) : (
        <>🟢 Tenant Auto-Caller: ACTIVE</>
      )}
      <div className="text-xs mt-1">
        Tenant: {tenantId.slice(0, 8)}... | Calls: {status.callCount}
      </div>
    </div>
  )
}