'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PlatformOwnerAuthProps {
  onAuthenticated: () => void
  onCancel: () => void
}

export default function PlatformOwnerAuth({ onAuthenticated, onCancel }: PlatformOwnerAuthProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check platform owner credentials
      const { data: ownerData, error: ownerError } = await supabase
        .from('platform_owners')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single()

      if (ownerError || !ownerData) {
        setError('Invalid platform owner credentials')
        return
      }

      // Store owner session
      localStorage.setItem('platform_owner_session', JSON.stringify({
        id: ownerData.id,
        email: ownerData.email,
        name: ownerData.name,
        authenticated_at: new Date().toISOString()
      }))

      onAuthenticated()
    } catch (error) {
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-center">🏢 Platform Owner Access</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/30 text-white placeholder-white/50"
                placeholder="Platform owner email"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <Label className="text-white mb-2 block">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/30 text-white placeholder-white/50"
                placeholder="Platform owner password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded border border-red-500/30">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Authenticating...' : 'Access Dashboard'}
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}