'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchUserData = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', userId).single()
    if (profile) setSelfUsername(profile.username)
    try {
      const { count } = await supabase
        .from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('read', false)
      setNotifCount(count || 0)
    } catch (_) {}
  }

  // Self-check auth + fetch username/notifs
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced search as user types
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runQuickSearch(query.trim())
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const runQuickSearch = async (term: string) => {
    setLoading(true)
    const quick: QuickResult[] = []

    // Bands
    const { data: bands } = await supabase
      .from('bands')
      .select('name, slug, country, logo_url')
      .eq('is_published', true)
      .ilike('name', `%${term}%`)
      .limit(3)

    bands?.forEach(b => quick.push({
      type: 'band',
      label: b.name,
      sublabel: b.country || 'Band',
      href: `/bands/${b.slug}`,
      image: b.logo_url,
    }))

    // Releases
    const { data: releases } = await supabase
      .from('releases')
      .select('title, release_type, cover_url, bands(name, slug)')
      .ilike('title', `%${term}%`)
      .limit(2)

    releases?.forEach((r: any) => quick.push({
      type: 'release',
      label: r.title,
      sublabel: `${r.release_type}${r.bands?.name ? ` · ${r.bands.name}` : ''}`,
      href: `/bands/${r.bands?.slug}`,
      image: r.cover_url,
    }))

    // Members
    const { data: members } = await supabase
      .from('band_members')
      .select('name, instrument, bands(name, slug, logo_url)')
      .ilike('name', `%${term}%`)
      .limit(2)

    members?.forEach((m: any) => quick.push({
      type: 'member',
      label: m.name,
      sublabel: `${m.instrument}${m.bands?.name ? ` · ${m.bands.name}` : ''}`,
      href: `/bands/${m.bands?.slug}`,
      image: m.bands?.logo_url,
    }))

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
    <nav className="border-b border-zinc-800 px-6 py-3 flex items-center gap-6">
      {/* Logo + back */}
      <div className="flex flex-col shrink-0">
        <Link href="/" className="text-xl font-black tracking-widest uppercase text-red-500 leading-tight">
          The Metalist
        </Link>
        {backHref && backLabel && (
          <Link href={backHref} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-0.5">
            ← {backLabel}
          </Link>
        )}
      </div>

      {/* Centre nav links */}
      <div className="hidden md:flex items-center gap-5 shrink-0">
        <Link href="/explore" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          Explore
        </Link>
        <Link href="/rankings" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          Rankings
        </Link>
        <Link href="/find" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          Musicians
        </Link>
        <Link href="/shows" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          Shows
        </Link>
        <Link href="/activity" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          Activity
        </Link>
        <Link href="/reviews" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          Reviews
        </Link>
      </div>

      {/* Search bar with dropdown */}
      <div ref={wrapperRef} className="flex-1 max-w-md relative">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search bands, releases, musicians..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-zinc-600"
          />
        </form>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
            {loading ? (
              <p className="text-xs text-zinc-600 px-4 py-3 animate-pulse">Searching...</p>
            ) : (
              <>
                {results.map((result, i) => (
                  <button key={i} onClick={() => handleSelect(result.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-800 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-sm">
                      {result.image
                        ? <img src={result.image} alt={result.label} className="w-full h-full object-cover" />
                        : <span>{typeIcon(result.type)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{result.label}</p>
                      <p className="text-xs text-zinc-500 truncate">{result.sublabel}</p>
                    </div>
                    <span className="text-xs text-zinc-700 uppercase tracking-widest shrink-0">
                      {result.type}
                    </span>
                  </button>
                ))}
                {query.length >= 2 && (
                  <button onClick={() => { setOpen(false); router.push(`/search?q=${encodeURIComponent(query)}`) }}
                    className="w-full px-4 py-3 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-900 transition-colors text-left">
                    See all results for "{query}" →
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-auto shrink-0">
        {resolvedUser ? (
          <>
            {resolvedUsername && (
              <span className="text-zinc-400 text-sm hidden md:block">
                Hey, <span className="text-white font-bold">{resolvedUsername}</span> 🤘
              </span>
            )}

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
                  <p className="text-xs uppercase tracking-widest text-zinc-500 px-4 pt-3 pb-2">Notifications</p>
                  {notifs.length === 0 ? (
                    <p className="text-xs text-zinc-600 px-4 pb-4">You're all caught up.</p>
                  ) : (
                    <div>
                      {notifs.map(n => (
                        <button key={n.id}
                          onClick={() => { setNotifOpen(false); if (n.href) router.push(n.href) }}
                          className="w-full text-left px-4 py-3 border-t border-zinc-800 hover:bg-zinc-900 transition-colors">
                          <p className="text-sm text-white font-medium">{n.title}</p>
                          {n.body && <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>}
                          <p className="text-xs text-zinc-700 mt-0.5">
                            {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
              Dashboard
            </Link>
            <Link href="/dashboard/profile" className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest hidden md:block">
              Profile
            </Link>
            <button onClick={resolvedLogout}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="border border-zinc-700 text-zinc-300 px-4 py-1.5 rounded-lg hover:border-red-500 hover:text-white transition-colors text-sm">
              Login
            </Link>
            <Link href="/register" className="border border-red-600 bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm">
              Join
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
