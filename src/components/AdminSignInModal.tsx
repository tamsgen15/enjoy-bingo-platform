'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/AdminContext'

export default function AdminSignInModal() {
  const { login, logout } = useAdmin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')
    
    const success = await login(username, password)
    if (!success) {
      setError('Invalid credentials')
    }
    
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-8 max-w-md w-full mx-4">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white text-center">🔐 Admin Sign In</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter username"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full enjot-button disabled:opacity-50"
            >
              {loading ? 'Signing In...' : '🔑 Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}