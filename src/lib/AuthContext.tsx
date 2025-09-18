'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  role: 'admin' | 'owner' | 'player'
}

interface AuthContextType {
  user: User | null
  login: (credentials: { username: string; password: string }) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check existing sessions
    const ownerAuth = localStorage.getItem('owner_authenticated')
    const adminAuth = localStorage.getItem('admin_authenticated')
    
    if (ownerAuth === 'true') {
      setUser({ id: 'owner', name: 'Platform Owner', role: 'owner' })
    } else if (adminAuth === 'true') {
      setUser({ id: 'admin', name: 'Game Admin', role: 'admin' })
    }
  }, [])

  const login = async (credentials: { username: string; password: string }) => {
    // Owner login
    if (credentials.username === 'Enjoyowner@1501' && credentials.password === 'Enjoyowner@1501') {
      localStorage.setItem('owner_authenticated', 'true')
      setUser({ id: 'owner', name: 'Platform Owner', role: 'owner' })
      return true
    }
    
    // Admin login - multiple valid credentials
    if ((credentials.username === 'admin' && credentials.password === 'admin123') ||
        (credentials.username === 'Admin' && credentials.password === 'Enjoy@1501')) {
      localStorage.setItem('admin_authenticated', 'true')
      setUser({ id: 'admin', name: 'Game Admin', role: 'admin' })
      return true
    }
    
    return false
  }

  const logout = () => {
    localStorage.removeItem('owner_authenticated')
    localStorage.removeItem('admin_authenticated')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}