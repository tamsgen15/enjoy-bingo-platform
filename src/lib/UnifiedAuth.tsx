'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

interface User {
  id: string
  username: string
  role: 'player' | 'admin' | 'owner'
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // First get all users with matching username
      const { data: users, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)

      if (error) {
        console.error('Database error:', error)
        return false
      }

      if (!users || users.length === 0) {
        console.log('No user found with username:', username)
        return false
      }

      // Check password match
      const matchedUser = users.find((u: any) => u.password === password)
      if (!matchedUser) {
        console.log('Password mismatch for user:', username)
        return false
      }

      const userData = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role || 'admin'
      }

      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    } catch (err) {
      console.error('Login exception:', err)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}