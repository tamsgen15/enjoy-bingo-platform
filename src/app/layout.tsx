import './globals.css'
import { Inter } from 'next/font/google'
import { RealtimeGameProvider } from '@/lib/RealtimeGameContext'
import { AuthProvider } from '@/lib/UnifiedAuth'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Enjoy Bingo - Multiplayer Bingo Game',
  description: 'Real-time multiplayer bingo with betting system',
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
            <Header />
            {children}
          </RealtimeGameProvider>
        </AuthProvider>
      </body>
    </html>
  )
}