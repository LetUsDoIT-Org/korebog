'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Hjem', icon: '🏠' },
  { href: '/trips', label: 'Ture', icon: '🛣️' },
  { href: '/vehicle', label: 'Bil', icon: '🚗' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-full h-full text-xs ${
                isActive
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
