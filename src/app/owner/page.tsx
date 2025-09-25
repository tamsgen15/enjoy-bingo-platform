'use client'

import { useAuth } from '@/lib/UnifiedAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/ProtectedRoute'

function OwnerLogin() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/owner/dashboard')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="pt-6 p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h1 className="text-3xl font-bold text-white mb-2">Owner Portal</h1>
            <p className="text-white/70 mb-6">Platform Administration</p>
            <p className="text-white/60 mb-6">Please sign in with owner credentials to access the dashboard</p>
            
            <Button 
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OwnerPage() {
  return <OwnerLogin />
}