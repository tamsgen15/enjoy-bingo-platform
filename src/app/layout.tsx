import './globals.css'
import { Inter } from 'next/font/google'
import { RealtimeGameProvider } from '@/lib/RealtimeGameContext'
import { AuthProvider } from '@/lib/UnifiedAuth'
import ConditionalHeader from '@/components/ConditionalHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Enjoy Bingo Platform - Multi-Tenant Gaming Platform',
  description: 'Multi-tenant bingo gaming platform with subscription management',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <RealtimeGameProvider>
            <ConditionalHeader />
            {children}
          </RealtimeGameProvider>
        </AuthProvider>
      </body>
    </html>
  )
}