// Best practice: Hybrid session management
import { supabase } from './supabase'

interface SessionData {
  user_email: string
  tenant_id?: string
  tenant_name?: string
  expires_at: string
  session_token: string
}

class SessionManager {
  private static instance: SessionManager
  
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  // Create session (database + localStorage cache)
  async createSession(userEmail: string, tenantId?: string, tenantName?: string): Promise<boolean> {
    try {
      // Create in database
      const { data, error } = await supabase.rpc('manage_user_session', {
        p_user_email: userEmail,
        p_tenant_id: tenantId,
        p_tenant_name: tenantName
      })

      if (error || !data?.success) return false

      // Cache in localStorage for performance
      const sessionData: SessionData = {
        user_email: userEmail,
        tenant_id: tenantId,
        tenant_name: tenantName,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        session_token: `session_${Date.now()}`
      }
      
      localStorage.setItem('session_cache', JSON.stringify(sessionData))
      return true
    } catch {
      return false
    }
  }

  // Get session (localStorage first, database fallback)
  async getSession(): Promise<SessionData | null> {
    try {
      // Try cache first for performance
      const cached = localStorage.getItem('session_cache')
      if (cached) {
        const session = JSON.parse(cached)
        if (new Date(session.expires_at) > new Date()) {
          return session
        }
        localStorage.removeItem('session_cache')
      }

      // Fallback to database
      const { data } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        // Update cache
        const sessionData: SessionData = {
          user_email: data.user_email,
          tenant_id: data.tenant_id,
          tenant_name: data.tenant_name,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          session_token: `session_${Date.now()}`
        }
        localStorage.setItem('session_cache', JSON.stringify(sessionData))
        return sessionData
      }

      return null
    } catch {
      return null
    }
  }

  // Logout (clear both)
  async logout(userEmail?: string): Promise<void> {
    try {
      // Clear database session
      if (userEmail) {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_email', userEmail)
      }
      
      // Clear cache
      localStorage.removeItem('session_cache')
    } catch (error) {
      console.warn('Logout error:', error)
    }
  }
}

export const sessionManager = SessionManager.getInstance()