'use client'

import { useState, useEffect } from 'react'
import { platformService, type Tenant, type PlatformRevenue } from '@/lib/platformService'
import PlatformOwnerAuth from '@/components/PlatformOwnerAuth'

export default function PlatformOwnerDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [revenue, setRevenue] = useState<PlatformRevenue[]>([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeTenants: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    phone: '',
    country: ''
  })

  useEffect(() => {
    // Check if already authenticated
    const session = localStorage.getItem('platform_owner_session')
    if (session) {
      try {
        const parsed = JSON.parse(session)
        const authTime = new Date(parsed.authenticated_at)
        const now = new Date()
        const hoursDiff = (now.getTime() - authTime.getTime()) / (1000 * 60 * 60)
        
        if (hoursDiff < 24) {
          setAuthenticated(true)
          loadData()
        } else {
          localStorage.removeItem('platform_owner_session')
          setShowAuthModal(true)
        }
      } catch {
        localStorage.removeItem('platform_owner_session')
        setShowAuthModal(true)
      }
    } else {
      setShowAuthModal(true)
    }
  }, [])

  useEffect(() => {
    if (!authenticated) return
    
    loadData()
    
    // Setup realtime subscriptions
    const { supabase } = require('@/lib/supabase')
    
    const subscriptionsChannel = supabase
      .channel('platform_subscriptions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_subscriptions'
      }, () => {
        loadData() // Reload data on any change
      })
      .subscribe()
    
    const revenueChannel = supabase
      .channel('platform_revenue_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_revenue'
      }, () => {
        loadData() // Reload data on any change
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(subscriptionsChannel)
      supabase.removeChannel(revenueChannel)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tenantsResult, revenueResult] = await Promise.all([
        platformService.getAllTenants(),
        platformService.getPlatformRevenue()
      ])

      if (tenantsResult.success) {
        setTenants(tenantsResult.tenants || [])
      }

      if (revenueResult.success) {
        setRevenue(revenueResult.revenue || [])
        setStats({
          totalRevenue: revenueResult.total_revenue || 0,
          monthlyRevenue: revenueResult.monthly_revenue || 0,
          activeTenants: revenueResult.active_tenants || 0
        })
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await platformService.createTenant(
      newTenant.name,
      newTenant.email,
      newTenant.phone,
      newTenant.country
    )

    if (result.success) {
      setNewTenant({ name: '', email: '', phone: '', country: '' })
      setShowCreateForm(false)
      loadData()
      alert('Tenant created successfully!')
    } else {
      alert(result.error || 'Failed to create tenant')
    }
  }

  const handleActivateSubscription = async (tenantId: string) => {
    const result = await platformService.activateSubscription(tenantId)
    
    if (result.success) {
      loadData()
      alert('Subscription activated successfully!')
    } else {
      alert(result.error || 'Failed to activate subscription')
    }
  }

  const handleUpdateStatus = async (tenantId: string, status: 'active' | 'suspended' | 'expired') => {
    const result = await platformService.updateTenantStatus(tenantId, status)
    
    if (result.success) {
      loadData()
      alert('Status updated successfully!')
    } else {
      alert(result.error || 'Failed to update status')
    }
  }

  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <PlatformOwnerAuth
          onAuthenticated={() => {
            setAuthenticated(true)
            setShowAuthModal(false)
          }}
          onCancel={() => window.location.href = '/'}
        />
      </div>
    )
  }

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-xl text-white">Loading platform data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Platform Owner Dashboard</h1>
              <p className="text-white/70">Manage tenants, subscriptions, and platform revenue</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('platform_owner_session')
                setAuthenticated(false)
                setShowAuthModal(true)
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-400">{stats.totalRevenue.toLocaleString()} ETB</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">Monthly Revenue</h3>
            <p className="text-3xl font-bold text-blue-400">{stats.monthlyRevenue.toLocaleString()} ETB</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white/90 mb-2">Active Tenants</h3>
            <p className="text-3xl font-bold text-purple-400">{stats.activeTenants}</p>
          </div>
        </div>

        {/* Tenant Management */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Tenant Management</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create New Tenant
            </button>
          </div>

          {/* Create Tenant Form */}
          {showCreateForm && (
            <div className="mb-6 p-4 border border-white/20 rounded-lg bg-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Tenant</h3>
              <form onSubmit={handleCreateTenant} className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Tenant Name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white placeholder-white/50 rounded-lg px-3 py-2"
                  required
                />
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={newTenant.email}
                  onChange={(e) => setNewTenant({...newTenant, email: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white placeholder-white/50 rounded-lg px-3 py-2"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (Optional)"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({...newTenant, phone: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white placeholder-white/50 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={newTenant.country}
                  onChange={(e) => setNewTenant({...newTenant, country: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white placeholder-white/50 rounded-lg px-3 py-2"
                />
                <div className="col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Create Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tenants Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/10">
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Tenant Name</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Admin Email</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Status</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Country</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">End Date</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="border border-white/20 px-4 py-2 text-white">{tenant.tenant_name}</td>
                    <td className="border border-white/20 px-4 py-2 text-white">{tenant.admin_email}</td>
                    <td className="border border-white/20 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        tenant.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.subscription_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        tenant.subscription_status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tenant.subscription_status}
                      </span>
                    </td>
                    <td className="border border-white/20 px-4 py-2 text-white">{tenant.country || 'N/A'}</td>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      {tenant.end_date ? new Date(tenant.end_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="border border-white/20 px-4 py-2">
                      <div className="flex gap-2">
                        {tenant.subscription_status === 'pending' && (
                          <button
                            onClick={() => handleActivateSubscription(tenant.tenant_id)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Activate
                          </button>
                        )}
                        {tenant.subscription_status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(tenant.tenant_id, 'suspended')}
                            className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Suspend
                          </button>
                        )}
                        {tenant.subscription_status === 'suspended' && (
                          <button
                            onClick={() => handleUpdateStatus(tenant.tenant_id, 'active')}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue History */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Revenue History</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/10">
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Date</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Tenant</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Amount</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Period</th>
                  <th className="border border-white/20 px-4 py-2 text-left text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      {(payment as any).platform_subscriptions?.tenant_name || 'N/A'}
                    </td>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      {payment.payment_amount.toLocaleString()} ETB
                    </td>
                    <td className="border border-white/20 px-4 py-2 text-white">
                      {payment.subscription_period_start && payment.subscription_period_end ? 
                        `${new Date(payment.subscription_period_start).toLocaleDateString()} - ${new Date(payment.subscription_period_end).toLocaleDateString()}` :
                        'N/A'
                      }
                    </td>
                    <td className="border border-white/20 px-4 py-2">
                      <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                        {payment.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}