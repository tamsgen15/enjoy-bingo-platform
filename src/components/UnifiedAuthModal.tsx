'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/UnifiedAuth'

interface UnifiedAuthModalProps {
  onClose?: () => void
  requiredRole?: 'player' | 'admin' | 'owner'
}

export default function UnifiedAuthModal({ onClose, requiredRole }: UnifiedAuthModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return

    setIsLoading(true)
    setError('')

    const success = await login(username, password)
    
    if (success) {
      onClose?.()
    } else {
      setError('Invalid credentials')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-center text-white">
            🔐 Sign In
            {requiredRole && (
              <div className="text-sm text-white/60 mt-1">
                {requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} access required
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="bg-slate-700 border-slate-600 text-white placeholder-white/50"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-slate-700 border-slate-600 text-white placeholder-white/50"
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={!username || !password || isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              {onClose && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-600 text-white hover:bg-slate-700"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
          <div className="mt-4 text-xs text-white/60 text-center">
            <div>Demo Accounts:</div>
            <div>Admin: admin/admin123</div>
            <div>Owner: Admin/Enjoy@1501</div>
            <div>Player: player1/player123</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}