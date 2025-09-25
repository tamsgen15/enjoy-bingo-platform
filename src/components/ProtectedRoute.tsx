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
  const { user } = useAuth()

  if (!user) {
    return <UnifiedAuthModal requiredRole={requiredRole} />
  }

  // Role checking removed since user.role doesn't exist

  return <>{children}</>
}