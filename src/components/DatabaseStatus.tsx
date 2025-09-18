'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DatabaseStatus {
  connected: boolean
  tablesExist: boolean
  error: string | null
  loading: boolean
}

export function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus>({
    connected: false,
    tablesExist: false,
    error: null,
    loading: true
  })

  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  const checkDatabaseStatus = async () => {
    if (!supabase) {
      setStatus({
        connected: false,
        tablesExist: false,
        error: 'Supabase client not initialized',
        loading: false
      })
      return
    }

    try {
      // Test basic connection
      const { error: connectionError } = await supabase.from('games').select('id').limit(1)
      
      if (connectionError) {
        if (connectionError.code === 'PGRST116' || connectionError.message?.includes('relation')) {
          setStatus({
            connected: true,
            tablesExist: false,
            error: 'Database tables not found. Please run the setup script.',
            loading: false
          })
          return
        }
        
        throw connectionError
      }

      // Check if all required tables exist
      const tables = ['games', 'players', 'called_numbers', 'bingo_cards', 'bingo_patterns']
      const tableChecks = await Promise.all(
        tables.map(async (table) => {
          try {
            const { error } = await supabase.from(table).select('*').limit(1)
            return { table, exists: !error }
          } catch {
            return { table, exists: false }
          }
        })
      )

      const missingTables = tableChecks.filter(check => !check.exists)
      
      if (missingTables.length > 0) {
        setStatus({
          connected: true,
          tablesExist: false,
          error: `Missing tables: ${missingTables.map(t => t.table).join(', ')}`,
          loading: false
        })
        return
      }

      setStatus({
        connected: true,
        tablesExist: true,
        error: null,
        loading: false
      })
    } catch (error: any) {
      setStatus({
        connected: false,
        tablesExist: false,
        error: error.message || 'Connection failed',
        loading: false
      })
    }
  }

  if (status.loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          <span className="text-yellow-800">Checking database connection...</span>
        </div>
      </div>
    )
  }

  if (!status.connected || !status.tablesExist) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-red-800 font-medium">Database Issue</h3>
            <p className="text-red-600 text-sm mt-1">{status.error}</p>
            {!status.tablesExist && (
              <div className="mt-2 text-sm text-red-600">
                <p>To fix this:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Go to your Supabase project dashboard</li>
                  <li>Open the SQL Editor</li>
                  <li>Run the script: <code className="bg-red-100 px-1 rounded">supabase/fix_database_errors.sql</code></li>
                </ol>
              </div>
            )}
          </div>
          <button
            onClick={checkDatabaseStatus}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        <span className="text-green-800">Database connected successfully</span>
      </div>
    </div>
  )
}