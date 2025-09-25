'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
// Temporary fix: using text icons instead of lucide-react
const LogOut = () => <span>🚪</span>
const Home = () => <span>🏠</span>
const Settings = () => <span>⚙️</span>
const Users = () => <span>👥</span>
const GamepadIcon = () => <span>🎮</span>
const BarChart3 = () => <span>📊</span>

export default function TopNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('username')
    localStorage.removeItem('userRole')
    router.push('/')
  }

  const navItems = [
    { href: '/admin', label: 'Admin', icon: Settings },
    { href: '/game', label: 'Games', icon: GamepadIcon },
    { href: '/owner/dashboard', label: 'Owner', icon: BarChart3 },
    { href: '/', label: 'Home', icon: Home },
  ]

  return (
    <header className="bg-slate-800/90 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-8">
            <Link href="/" className="text-sm sm:text-xl font-bold text-white">
              🎯 Bingo
            </Link>
            
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" {...({} as any)} />
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {/* Mobile Navigation */}
            <nav className="flex md:hidden space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-2 py-1 rounded text-xs transition-colors ${
                    pathname === item.href
                      ? 'bg-white/20 text-white'
                      : 'text-white/70'
                  }`}
                >
                  <item.icon className="h-3 w-3" {...({} as any)} />
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation actions can be added here */}
          </div>
        </div>
      </div>
    </header>
  )
}