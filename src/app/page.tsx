'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const features = [
  {
    icon: '🎮',
    title: 'Real-Time Gaming',
    description: 'Experience seamless multiplayer bingo with instant number calling and live player interactions.',
    gradient: 'from-purple-600 to-blue-600'
  },
  {
    icon: '💰',
    title: 'Revenue Control',
    description: 'Set your own platform fees (0-50%) and keep 100% of your commission. Full financial transparency.',
    gradient: 'from-green-600 to-teal-600'
  },
  {
    icon: '🔒',
    title: 'Complete Isolation',
    description: 'Enterprise-grade security with tenant data separation. Your games, your players, your privacy.',
    gradient: 'from-red-600 to-pink-600'
  },
  {
    icon: '📱',
    title: 'Multi-Device Access',
    description: 'Manage games from anywhere. Synchronized sessions across all devices with real-time updates.',
    gradient: 'from-yellow-600 to-orange-600'
  },
  {
    icon: '🎯',
    title: 'Smart Analytics',
    description: 'Track player engagement, revenue trends, and game performance with detailed insights.',
    gradient: 'from-indigo-600 to-purple-600'
  }
]

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-32 h-32 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-32 h-32 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-4 py-8 sm:p-6 lg:p-8">
        <div className="w-full max-w-sm sm:max-w-2xl lg:max-w-6xl mx-auto text-center">
          {/* Logo and Title */}
          <div className="mb-6 sm:mb-12 lg:mb-16">
            <div className="relative flex justify-center">
              <img src="/logo.png" alt="Enjoy Bingo" className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mb-3 sm:mb-4 lg:mb-6 drop-shadow-2xl" />
              <div className="absolute inset-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/20 rounded-full blur-xl"></div>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-3 sm:mb-4 lg:mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight">
              Enjoy Bingo
            </h1>
            <p className="text-base sm:text-xl lg:text-2xl text-white/80 mb-2 sm:mb-3 lg:mb-4 px-2">Premium Multi-Tenant Gaming Platform</p>
            <p className="text-sm sm:text-base lg:text-lg text-white/60 px-4">Where Entertainment Meets Enterprise</p>
          </div>

          {/* Feature Carousel */}
          <div className="mb-6 sm:mb-12 lg:mb-16">
            <div className="relative w-full max-w-xs sm:max-w-2xl lg:max-w-4xl mx-auto">
              <div className="overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl">
                <div 
                  className="flex transition-transform duration-1000 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {features.map((feature, index) => (
                    <div key={index} className="w-full flex-shrink-0">
                      <div className={`bg-gradient-to-br ${feature.gradient} p-4 sm:p-8 lg:p-12 text-white relative overflow-hidden min-h-[200px] sm:min-h-[250px] lg:min-h-[300px] flex flex-col justify-center`}>
                        <div className="absolute top-0 right-0 w-12 h-12 sm:w-20 sm:h-20 lg:w-32 lg:h-32 bg-white/10 rounded-full -translate-y-6 translate-x-6 sm:-translate-y-10 sm:translate-x-10 lg:-translate-y-16 lg:translate-x-16"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-white/10 rounded-full translate-y-4 -translate-x-4 sm:translate-y-8 sm:-translate-x-8 lg:translate-y-12 lg:-translate-x-12"></div>
                        <div className="relative z-10 text-center">
                          <div className="text-3xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 lg:mb-6">{feature.icon}</div>
                          <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 lg:mb-4 leading-tight">{feature.title}</h3>
                          <p className="text-xs sm:text-base lg:text-xl text-white/90 leading-relaxed px-2 sm:px-4">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 touch-manipulation ${
                      index === currentSlide ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60 active:bg-white/80'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tenant Access CTA */}
          <div className="w-full max-w-xs sm:max-w-md mx-auto mb-6 sm:mb-12 lg:mb-16 px-2">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 hover:bg-white/15 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
              <div className="text-2xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4 lg:mb-6">🏢</div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 leading-tight">Start Your Journey</h2>
              <p className="text-xs sm:text-sm lg:text-base text-white/80 mb-4 sm:mb-6 lg:mb-8 leading-relaxed px-2">
                Access your premium gaming platform. Manage games, players, and revenue with enterprise-grade tools.
              </p>
              <Link 
                href="/tenant"
                className="inline-block w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 rounded-md sm:rounded-lg lg:rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg text-xs sm:text-sm lg:text-base touch-manipulation"
              >
                Access Tenant Dashboard
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-8 mb-6 sm:mb-12 lg:mb-16 px-2">
            <div className="text-center bg-white/5 rounded-lg p-2 sm:p-4 lg:p-6">
              <div className="text-lg sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">99.9%</div>
              <div className="text-xs sm:text-sm lg:text-base text-white/70 leading-tight">Uptime Guarantee</div>
            </div>
            <div className="text-center bg-white/5 rounded-lg p-2 sm:p-4 lg:p-6">
              <div className="text-lg sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">0-50%</div>
              <div className="text-xs sm:text-sm lg:text-base text-white/70 leading-tight">Flexible Commission</div>
            </div>
            <div className="text-center bg-white/5 rounded-lg p-2 sm:p-4 lg:p-6">
              <div className="text-lg sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">24/7</div>
              <div className="text-xs sm:text-sm lg:text-base text-white/70 leading-tight">Premium Support</div>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-center px-2">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4 lg:mb-6">Premium Platform Access</h3>
            <div className="inline-block bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 text-white px-6 py-3 sm:px-10 sm:py-5 lg:px-12 lg:py-6 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-300 touch-manipulation">
              <div className="text-xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">20,000 ETB</div>
              <div className="text-xs sm:text-base lg:text-lg opacity-90">per month per tenant</div>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-white/70 mt-3 sm:mt-4 lg:mt-6 max-w-xs sm:max-w-lg lg:max-w-2xl mx-auto leading-relaxed px-2">
              Complete platform access • Advanced game hosting • Enterprise database • Premium support • Real-time analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}