'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type QuickResult = {
  type: 'band' | 'release' | 'member'
  label: string
  sublabel: string
  href: string
  image: string | null
}

type Notif = {
  id: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  created_at: string
}

interface GlobalNavProps {
  backHref?: string
  backLabel?: string
  username?: string
  onLogout?: () => void
  currentUser?: string | null
}

const BANDS_DROPDOWN = [
  { href: '/explore',  label: 'All Bands',  desc: 'Browse & filter bands' },
  { href: '/releases', label: 'Releases',   desc: 'Albums, EPs & singles' },
  { href: '/rankings', label: 'Rankings',   desc: 'Top rated & most followed' },
  { href: '/compare',  label: 'Compare',    desc: 'Compare two bands side by side' },
  { href: '/shows',    label: 'Shows',      desc: 'Upcoming tour dates' },
]

const NAV_LINKS = [
  { href: '/activity', label: 'Activity' },
  { href: '/reviews',  label: 'Reviews' },
  { href: '/members',  label: 'Members' },
  { href: '/feed',     label: 'My Feed' },
]

export default function GlobalNav({ backHref, backLabel, username, onLogout, currentUser }: GlobalNavProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selfUser, setSelfUser] = useState<string | null | undefined>(undefined)
  const [selfUsername, setSelfUsername] = useState<string | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bandsOpen, setBandsOpen] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const bandsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Close menus on route change
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); setBandsOpen(false) }, [pathname])

  // Lock body scroll when mobile menu or search is open
  useEffect(() => {
    document.body.style.overflow = (mobileOpen || searchOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, searchOpen])

  // Focus search input when overlay opens
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]); setOpen(false) }
  }, [searchOpen])

  // ESC closes search overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const fetchUserData = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', userId).single()
    if (profile) setSelfUsername(profile.username)
    try {
      const [{ count: notifs }, { count: msgs }] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('read', false),
        supabase.from('messages').select('id', { count: 'exact', head: true })
          .eq('recipient_id', userId).is('read_at', null),
      ])
      setNotifCount(notifs || 0)
      setUnreadMessages(msgs || 0)
    } catch (_) {}
  }

  useEffect(() => {
    if (currentUser !== undefined) {
      if (currentUser) fetchUserData(currentUser)
      return
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSelfUser(user?.id ?? null)
      if (user) fetchUserData(user.id)
    })
  }, [currentUser])

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (bandsRef.current && !bandsRef.current.contains(e.target as Node)) {
        setBandsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])


  const resolvedUser = currentUser !== undefined ? currentUser : selfUser
  const resolvedUsername = username || selfUsername

  const handleInternalLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }
  const resolvedLogout = onLogout || handleInternalLogout

  const loadNotifs = async () => {
    const uid = resolvedUser as string
    if (!uid) return
    try {
      const { data } = await supabase
        .from('notifications').select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setNotifs(data)
      await supabase.from('notifications').update({ read: true })
        .eq('user_id', uid).eq('read', false)
      setNotifCount(0)
    } catch (_) {}
  }

  const handleBellClick = () => {
    const opening = !notifOpen
    setNotifOpen(opening)
    if (opening) loadNotifs()
  }

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runQuickSearch(query.trim()), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const runQuickSearch = async (term: string) => {
    setLoading(true)
    const quick: QuickResult[] = []

    const { data: bands } = await supabase
      .from('bands').select('name, slug, country, logo_url')
      .eq('is_published', true).ilike('name', `%${term}%`).limit(3)
    bands?.forEach(b => quick.push({ type: 'band', label: b.name, sublabel: b.country || 'Band', href: `/bands/${b.slug}`, image: b.logo_url }))

    const { data: releases } = await supabase
      .from('releases').select('id, title, release_type, cover_url, bands(name, slug)')
      .ilike('title', `%${term}%`).limit(2)
    releases?.forEach((r: any) => quick.push({ type: 'release', label: r.title, sublabel: `${r.release_type}${r.bands?.name ? ` · ${r.bands.name}` : ''}`, href: `/releases/${r.id}`, image: r.cover_url }))

    const { data: members } = await supabase
      .from('band_members').select('name, instrument, bands(name, slug, logo_url)')
      .ilike('name', `%${term}%`).limit(2)
    members?.forEach((m: any) => quick.push({ type: 'member', label: m.name, sublabel: `${m.instrument}${m.bands?.name ? ` · ${m.bands.name}` : ''}`, href: `/bands/${m.bands?.slug}`, image: m.bands?.logo_url }))

    setResults(quick)
    setOpen(quick.length > 0)
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setOpen(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const typeIcon = (type: QuickResult['type']) => {
    if (type === 'band') return '🎸'
    if (type === 'release') return '💿'
    return '🎤'
  }

  return (
    <>
      <nav className="border-b border-zinc-800 px-4 md:px-6 py-3 flex items-center gap-3 md:gap-6 relative z-40 bg-black">
        {/* Logo + back */}
        <div className="flex flex-col shrink-0">
          <Link href="/" className="text-2xl font-display tracking-widest uppercase text-red-500 leading-tight">
            The Metalist
          </Link>
          {backHref && backLabel && (
            <Link href={backHref} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-0.5 hidden md:block">
              ← {backLabel}
            </Link>
          )}
        </div>

        {/* Centre nav links — desktop only */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          {/* Bands dropdown */}
          <div ref={bandsRef} className="relative">
            <button
              onClick={() => setBandsOpen(v => !v)}
              className={`flex items-center gap-1 text-xs uppercase tracking-widest transition-colors ${bandsOpen ? 'text-white' : 'text-zinc-600 hover:text-white'}`}>
              Bands
              <svg className={`w-3 h-3 transition-transform ${bandsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {bandsOpen && (
              <div className="absolute left-0 top-full mt-2 w-52 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
                {BANDS_DROPDOWN.map(item => (
                  <Link key={item.href} href={item.href}
                    className="flex flex-col px-4 py-3 hover:bg-zinc-900 transition-colors border-b border-zinc-800 last:border-0">
                    <span className="text-xs font-bold uppercase tracking-widest text-white">{item.label}</span>
                    <span className="text-xs text-zinc-600 mt-0.5">{item.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Flat nav links */}
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 md:gap-4 ml-auto shrink-0">
          {resolvedUser ? (
            <>
              {/* Notification bell */}
              <div ref={notifRef} className="relative">
                <button onClick={handleBellClick}
                  className="relative text-zinc-500 hover:text-white transition-colors p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                      <p className="text-xs uppercase tracking-widest text-zinc-500">Notifications</p>
                      <Link href="/notifications" onClick={() => setNotifOpen(false)}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
                        See all →
                      </Link>
                    </div>
                    {notifs.length === 0 ? (
                      <p className="text-xs text-zinc-600 px-4 pb-4">You're all caught up.</p>
                    ) : (
                      <div>
                        {notifs.map(n => (
                          <button key={n.id}
                            onClick={() => { setNotifOpen(false); if (n.href) router.push(n.href) }}
                            className="w-full text-left px-4 py-3 border-t border-zinc-800 hover:bg-zinc-900 transition-colors">
                            <div className="flex items-start gap-2">
                              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium">{n.title}</p>
                                {n.body && <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>}
                                <p className="text-xs text-zinc-700 mt-0.5">
                                  {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Messages icon */}
              <Link href="/messages" className="relative text-zinc-500 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>

              {/* Desktop auth links */}
              <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest hidden md:block">
                Dashboard
              </Link>
              {resolvedUsername && (
                <Link href={`/members/${resolvedUsername}`} className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest hidden md:block">
                  My Profile
                </Link>
              )}
              <button onClick={resolvedLogout}
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest hidden md:block">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="border border-zinc-700 text-zinc-300 px-4 py-1.5 rounded-lg hover:border-red-500 hover:text-white transition-colors text-sm hidden md:block">
                Login
              </Link>
              <Link href="/register" className="border border-red-600 bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm hidden md:block">
                Join
              </Link>
            </>
          )}

          {/* Search icon — always visible */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Search">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </button>

          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Open menu">
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileOpen(false)} />

          {/* Drawer */}
          <div className="relative ml-auto w-72 max-w-full h-full bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <span className="text-xl font-display tracking-widest uppercase text-red-500">The Metalist</span>
              <button onClick={() => setMobileOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-4 border-b border-zinc-800">
              <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) { setMobileOpen(false); router.push(`/search?q=${encodeURIComponent(query.trim())}`) }}}>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-zinc-600"
                />
              </form>
            </div>

            {/* Nav links */}
            <div className="px-5 py-4 border-b border-zinc-800 flex flex-col gap-1">
              <p className="text-xs text-zinc-700 uppercase tracking-widest mb-2">Bands</p>
              {BANDS_DROPDOWN.map(l => (
                <Link key={l.href} href={l.href}
                  className="py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors border-b border-zinc-900 last:border-0">
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="px-5 py-4 border-b border-zinc-800 flex flex-col gap-1">
              <p className="text-xs text-zinc-700 uppercase tracking-widest mb-2">Community</p>
              {NAV_LINKS.map(l => (
                <Link key={l.href} href={l.href}
                  className="py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors border-b border-zinc-900 last:border-0">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Account section */}
            <div className="px-5 py-4 flex flex-col gap-1">
              <p className="text-xs text-zinc-700 uppercase tracking-widest mb-2">Account</p>
              {resolvedUser ? (
                <>
                  {resolvedUsername && (
                    <p className="text-xs text-zinc-500 mb-3">
                      Signed in as <span className="text-white font-bold">{resolvedUsername}</span>
                    </p>
                  )}
                  <Link href="/dashboard"
                    className="py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors border-b border-zinc-900">
                    Dashboard
                  </Link>
                  {resolvedUsername && (
                    <Link href={`/members/${resolvedUsername}`}
                      className="py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors border-b border-zinc-900">
                      My Profile
                    </Link>
                  )}
                  <button onClick={() => { setMobileOpen(false); resolvedLogout() }}
                    className="py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-600 hover:text-red-400 transition-colors text-left">
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 mt-1">
                  <Link href="/login"
                    className="w-full text-center border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-lg hover:border-red-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                    Login
                  </Link>
                  <Link href="/register"
                    className="w-full text-center border border-red-600 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-bold uppercase tracking-widest">
                    Join Metalist
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Search bar row */}
          <div className="border-b border-zinc-800 px-4 md:px-6 py-4 flex items-center gap-4">
            <svg className="w-5 h-5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <form onSubmit={handleSubmit} className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search bands, releases, musicians..."
                className="w-full bg-transparent text-white text-lg md:text-xl focus:outline-none placeholder-zinc-700"
              />
            </form>
            {/* ESC hint — desktop */}
            <button onClick={() => setSearchOpen(false)}
              className="text-xs text-zinc-600 hover:text-zinc-400 uppercase tracking-widest hidden md:block shrink-0">
              ESC
            </button>
            {/* Close icon — mobile */}
            <button onClick={() => setSearchOpen(false)} className="md:hidden text-zinc-500 hover:text-white p-1 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
              {loading && (
                <p className="text-zinc-600 animate-pulse text-sm uppercase tracking-widest">Searching...</p>
              )}

              {!loading && results.length > 0 && (
                <div className="flex flex-col">
                  {results.map((result, i) => (
                    <button key={i}
                      onClick={() => { handleSelect(result.href); setSearchOpen(false) }}
                      className="flex items-center gap-4 py-4 border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors text-left px-2 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {result.image
                          ? <img src={result.image} alt={result.label} className="w-full h-full object-cover" />
                          : <span className="text-lg">{typeIcon(result.type)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{result.label}</p>
                        <p className="text-sm text-zinc-500 truncate">{result.sublabel}</p>
                      </div>
                      <span className="text-xs text-zinc-700 uppercase tracking-widest shrink-0">{result.type}</span>
                    </button>
                  ))}
                  {query.length >= 2 && (
                    <button
                      onClick={() => { setSearchOpen(false); router.push(`/search?q=${encodeURIComponent(query)}`) }}
                      className="mt-4 text-sm text-red-400 hover:text-red-300 transition-colors text-left py-3">
                      See all results for "{query}" →
                    </button>
                  )}
                </div>
              )}

              {!loading && query.length >= 2 && results.length === 0 && (
                <p className="text-zinc-600 text-sm">No results for "{query}"</p>
              )}

              {!loading && query.length < 2 && (
                <p className="text-zinc-700 text-sm uppercase tracking-widest">
                  Start typing to search...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Nav (logged-in only) ───────────────────────────────── */}
      {currentUser && (
        <nav className="fixed bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 flex justify-around items-center py-2 md:hidden z-40">
          {[
            { href: '/',          label: 'Home',    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
            { href: '/explore',   label: 'Explore', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
            { href: '/feed',      label: 'Feed',    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /> },
            { href: '/dashboard', label: 'Me',      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
          ].map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${active ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  {icon}
                </svg>
                <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
