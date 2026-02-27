'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

const LOGGED_IN_LINKS = [
  { href: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/explore', label: 'Explore', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { href: '/feed', label: 'Feed', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
  { href: '/dashboard', label: 'Me', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

const LOGGED_OUT_LINKS = [
  { href: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/explore', label: 'Explore', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { href: '/login', label: 'Login', icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' },
  { href: '/register', label: 'Join', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const links = user ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS

  return (
    <>
      {/* Solid black plate that covers the full bottom safe-area zone,
          so Safari/Chrome bottom UI and the "pill" sit over pure black,
          never over scrolling content. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 md:hidden bg-black pointer-events-none"
        style={{ height: 'max(3.5rem, calc(3.5rem + env(safe-area-inset-bottom, 0px)))' }}
        aria-hidden
      />

      {/* Actual navigation bar, rendered above the black plate. */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-zinc-800 flex justify-around items-center py-2 bg-black [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile navigation"
      >
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${active ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
