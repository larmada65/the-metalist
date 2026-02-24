'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type ActivityItem = {
  id: string
  type: 'band' | 'release' | 'show' | 'member'
  created_at: string
  title: string
  subtitle: string
  href: string
  image: string | null
  genreIds: number[]
}

type Genre = { id: number; name: string }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function parseShowDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const typeConfig = {
  band:    { icon: '🎸', label: 'New Band',    color: 'text-red-500',    border: 'border-red-900/40' },
  release: { icon: '💿', label: 'New Release', color: 'text-purple-400', border: 'border-purple-900/40' },
  show:    { icon: '📅', label: 'Show Added',  color: 'text-amber-400',  border: 'border-amber-900/40' },
  member:  { icon: '🤘', label: 'New Member',  color: 'text-green-400',  border: 'border-green-900/40' },
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ActivityItem['type'] | 'all'>('all')
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [
        { data: bands },
        { data: releases },
        { data: shows },
        { data: members },
        { data: genreData },
      ] = await Promise.all([
        supabase.from('bands')
          .select('id, name, slug, logo_url, country, genre_ids, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('releases')
          .select('id, title, release_type, cover_url, created_at, bands(name, slug, genre_ids)')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('shows')
          .select('id, date, city, country, created_at, bands(name, slug, logo_url, genre_ids)')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('band_members')
          .select('id, name, instrument, created_at, bands(name, slug, logo_url, genre_ids)')
          .eq('status', 'approved')
          .not('profile_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('genres_list').select('id, name').order('name'),
      ])

      const feed: ActivityItem[] = []

      bands?.forEach((b: any) => feed.push({
        id: `band-${b.id}`,
        type: 'band',
        created_at: b.created_at,
        title: b.name,
        subtitle: b.country || 'New band on the platform',
        href: `/bands/${b.slug}`,
        image: b.logo_url,
        genreIds: b.genre_ids || [],
      }))

      releases?.forEach((r: any) => feed.push({
        id: `release-${r.id}`,
        type: 'release',
        created_at: r.created_at,
        title: r.title,
        subtitle: `${r.release_type}${r.bands?.name ? ` · ${r.bands.name}` : ''}`,
        href: `/bands/${r.bands?.slug}`,
        image: r.cover_url,
        genreIds: r.bands?.genre_ids || [],
      }))

      shows?.forEach((s: any) => {
        const d = parseShowDate(s.date)
        const dateLabel = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        feed.push({
          id: `show-${s.id}`,
          type: 'show',
          created_at: s.created_at,
          title: s.bands?.name || 'Unknown Band',
          subtitle: `${dateLabel} · ${s.city}${s.country ? `, ${s.country}` : ''}`,
          href: `/bands/${s.bands?.slug}`,
          image: s.bands?.logo_url,
          genreIds: s.bands?.genre_ids || [],
        })
      })

      members?.forEach((m: any) => feed.push({
        id: `member-${m.id}`,
        type: 'member',
        created_at: m.created_at,
        title: m.name,
        subtitle: `Joined ${m.bands?.name || 'a band'}${m.instrument ? ` · ${m.instrument}` : ''}`,
        href: `/bands/${m.bands?.slug}`,
        image: m.bands?.logo_url,
        genreIds: m.bands?.genre_ids || [],
      }))

      feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setItems(feed)
      if (genreData) setAllGenres(genreData)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = items
    .filter(i => filter === 'all' || i.type === filter)
    .filter(i => !selectedGenre || i.genreIds.includes(selectedGenre))

  const activeGenres = allGenres.filter(g => items.some(i => i.genreIds.includes(g.id)))

  const counts = {
    band: items.filter(i => i.type === 'band').length,
    release: items.filter(i => i.type === 'release').length,
    show: items.filter(i => i.type === 'show').length,
    member: items.filter(i => i.type === 'member').length,
  }

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
      active
        ? 'bg-red-600 border-red-600 text-white'
        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
    }`

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Explore" />

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-black uppercase tracking-tight mb-2">Activity</h1>
          <p className="text-zinc-600 text-sm">
            What's been happening on the platform — new bands, releases, shows, and members.
          </p>
        </div>

        {/* Filter pills */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-3 mb-10">
          {activeGenres.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-zinc-600 uppercase tracking-widest shrink-0">Genre:</span>
              <button onClick={() => setSelectedGenre(null)}
                className={pillClass(selectedGenre === null)}>All</button>
              {activeGenres.map(g => (
                <button key={g.id} onClick={() => setSelectedGenre(prev => prev === g.id ? null : g.id)}
                  className={pillClass(selectedGenre === g.id)}>{g.name}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('all')} className={pillClass(filter === 'all')}>
              All ({items.length})
            </button>
            {counts.band > 0 && (
              <button onClick={() => setFilter('band')} className={pillClass(filter === 'band')}>
                🎸 Bands ({counts.band})
              </button>
            )}
            {counts.release > 0 && (
              <button onClick={() => setFilter('release')} className={pillClass(filter === 'release')}>
                💿 Releases ({counts.release})
              </button>
            )}
            {counts.show > 0 && (
              <button onClick={() => setFilter('show')} className={pillClass(filter === 'show')}>
                📅 Shows ({counts.show})
              </button>
            )}
            {counts.member > 0 && (
              <button onClick={() => setFilter('member')} className={pillClass(filter === 'member')}>
                🤘 Members ({counts.member})
              </button>
            )}
          </div>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-800 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/3" />
                </div>
                <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 shrink-0" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">🌑</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">Nothing yet. The underground is quiet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(item => {
              const cfg = typeConfig[item.type]
              return (
                <div key={item.id}
                  className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image
                      ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      : <span className="text-lg">{cfg.icon}</span>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold uppercase tracking-widest ${cfg.color} border ${cfg.border} px-1.5 py-0.5 rounded`}>
                        {cfg.label}
                      </span>
                    </div>
                    <Link href={item.href}
                      className="font-black uppercase tracking-wide text-sm hover:text-red-500 transition-colors truncate block mt-1">
                      {item.title}
                    </Link>
                    <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
                  </div>

                  {/* Time */}
                  <p className="text-xs text-zinc-700 shrink-0">{timeAgo(item.created_at)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
