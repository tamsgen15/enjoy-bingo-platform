// Temporary fix: using text icons instead of lucide-react
const BarChart3 = () => <span>📊</span>
const Users = () => <span>👥</span>
const GamepadIcon = () => <span>🎮</span>
const DollarSign = () => <span>💰</span>
const Settings = () => <span>⚙️</span>
const Home = () => <span>🏠</span>
const Trophy = () => <span>🏆</span>

interface MobileBottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userRole: 'admin' | 'owner'
}

export default function MobileBottomNav({ activeTab, onTabChange, userRole }: MobileBottomNavProps) {
  const adminTabs = [
    { id: 'overview', icon: Home, label: 'Home' },
    { id: 'game', icon: GamepadIcon, label: 'Game' },
    { id: 'players', icon: Users, label: 'Players' },
    { id: 'winner', icon: Trophy, label: 'Winner' }
  ]

  const ownerTabs = [
    { id: 'overview', icon: BarChart3, label: 'Stats' },
    { id: 'games', icon: GamepadIcon, label: 'Games' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'revenue', icon: DollarSign, label: 'Revenue' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ]

  const tabs = userRole === 'admin' ? adminTabs : ownerTabs

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 z-50 md:hidden">
      <div className="flex justify-around items-center py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'text-yellow-400 bg-yellow-400/10'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <tab.icon className="h-5 w-5 mb-1" {...({} as any)} />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}