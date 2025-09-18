'use client'

import { useAuth } from '@/lib/UnifiedAuth'
import UnifiedAuthModal from './UnifiedAuthModal'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'player' | 'admin' | 'owner'
  allowedRoles?: ('player' | 'admin' | 'owner')[]
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  allowedRoles = ['player', 'admin', 'owner'] 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <UnifiedAuthModal requiredRole={requiredRole} />
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-white/60">You need {requiredRole} access to view this page</p>
        </div>
      </div>
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-white/60">Insufficient permissions</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}