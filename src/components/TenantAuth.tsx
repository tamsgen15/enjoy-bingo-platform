'use client'

import { useState, useEffect } from 'react'
import { enhancedTenantService, type Tenant } from '@/lib/enhancedTenantService'
import { supabase } from '@/lib/supabase'

interface TenantAuthProps {
  onTenantAuthenticated: (tenant: Tenant) => void
}

export default function TenantAuth({ onTenantAuthenticated }: TenantAuthProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if tenant exists in platform_subscriptions (created by platform owner)
      const { data: tenantData, error: tenantError } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .eq('admin_email', email)
        .single()

      if (tenantError || !tenantData) {
        setError('Tenant not found. Contact platform owner to create your account.')
        return
      }

      // Check subscription status
      if (tenantData.subscription_status !== 'active') {
        setError(`Subscription ${tenantData.subscription_status}. Contact platform owner.`)
        return
      }

      // Create user session in database
      const { error: sessionError } = await supabase.rpc('manage_user_session', {
        p_user_email: email,
        p_tenant_id: tenantData.tenant_id,
        p_tenant_name: tenantData.tenant_name
      })

      if (sessionError) {
        setError('Failed to create session')
        return
      }

      // Return tenant data
      onTenantAuthenticated({
        id: tenantData.tenant_id,
        tenant_name: tenantData.tenant_name,
        admin_email: tenantData.admin_email,
        subscription_status: tenantData.subscription_status,
        subscription_start_date: tenantData.start_date,
        subscription_end_date: tenantData.end_date,
        monthly_fee: 20000
      })
      
    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Tenant Access</h1>
          <p className="text-gray-600">Enter your registered email to access your platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your registered email"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Access Platform'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need access? Contact the platform owner to create your tenant account.</p>
          <p className="mt-2">Monthly subscription: <span className="font-semibold">20,000 ETB</span></p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium mb-2">📞 Need Support?</p>
            <a 
              href="https://t.me/enjoybingogroup" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              📱 Join Telegram Support Group
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}