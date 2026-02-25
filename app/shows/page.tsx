'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Show = {
  id: string
  date: string
  city: string
  country: string | null
  venue: string | null
  ticket_url: string | null
  bands: {
    name: string
    slug: string
    logo_url: string | null
    genre_ids: number[] | null
  } | null
}

type Genre = { id: number; name: string }

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(dateStr: string) {
  const d = parseDate(dateStr)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
    weekday: d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase(),
  }
}

function countryToFlag(country: string): string {
  const flags: Record<string, string> = {
    'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Brazil': '🇧🇷',
    'Canada': '🇨🇦', 'Chile': '🇨🇱', 'Czech Republic': '🇨🇿', 'Denmark': '🇩🇰',
    'Finland': '🇫🇮', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Greece': '🇬🇷',
    'Hungary': '🇭🇺', 'Iceland': '🇮🇸', 'Ireland': '🇮🇪', 'Italy': '🇮🇹',
    'Japan': '🇯🇵', 'Mexico': '🇲🇽', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿',
    'Norway': '🇳🇴', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Russia': '🇷🇺',
    'Serbia': '🇷🇸', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'South Africa': '🇿🇦',
    'South Korea': '🇰🇷', 'Spain': '🇪🇸', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭',
    'Turkey': '🇹🇷', 'Ukraine': '🇺🇦', 'United Kingdom': '🇬🇧', 'United States': '🇺🇸',
  }
  return flags[country] || '🌍'
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0]
      const [{ data }, { data: genreData }] = await Promise.all([
        supabase.from('shows')
          .select('id, date, city, country, venue, ticket_url, bands(name, slug, logo_url, genre_ids)')
          .gte('date', today)
          .order('date', { ascending: true }),
        supabase.from('genres_list').select('id, name').order('name'),
      ])
      if (data) setShows(data as any)
      if (genreData) setAllGenres(genreData)
      setLoading(false)
    }
    load()
  }, [])

  const countries = [...new Set(shows.map(s => s.country).filter(Boolean))].sort() as string[]

  const filtered = shows
    .filter(s => !selectedCountry || s.country === selectedCountry)
    .filter(s => !selectedGenre || (s.bands?.genre_ids?.includes(selectedGenre) ?? false))

  // Only genres represented in the loaded shows
  const activeGenres = allGenres.filter(g => shows.some(s => s.bands?.genre_ids?.includes(g.id)))

  // Group by month for a calendar feel
  const grouped: Record<string, Show[]> = {}
  filtered.forEach(show => {
    const d = parseDate(show.date)
    const key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(show)
  })

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Bands" />

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-black uppercase tracking-tight mb-2">Shows</h1>
          <p className="text-zinc-600 text-sm">
            Upcoming gigs and tour dates from bands on the platform.
          </p>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex gap-8 mb-10 border-b border-zinc-800 pb-8">
            <div>
              <p className="text-3xl font-black">{shows.length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Upcoming shows</p>
            </div>
            {countries.length > 0 && (
              <div>
                <p className="text-3xl font-black">{countries.length}</p>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Countries</p>
              </div>
            )}
          </div>
        )}

        {/* Genre filter */}
        {activeGenres.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: 'none' }}>
            <span className="text-xs text-zinc-600 uppercase tracking-widest shrink-0 self-center">Genre:</span>
            <button onClick={() => setSelectedGenre(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
                selectedGenre === null ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}>All</button>
            {activeGenres.map(g => (
              <button key={g.id} onClick={() => setSelectedGenre(prev => prev === g.id ? null : g.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
                  selectedGenre === g.id ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>{g.name}</button>
            ))}
          </div>
        )}

        {/* Country filter */}
        {countries.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-10" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedCountry(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
                selectedCountry === null
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}>
              All Countries
            </button>
            {countries.map(c => (
              <button key={c}
                onClick={() => setSelectedCountry(prev => prev === c ? null : c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
                  selectedCountry === c
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>
                {countryToFlag(c)} {c}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-5">
                <div className="shrink-0 w-14 space-y-1">
                  <div className="h-7 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4 mx-auto" />
                </div>
                <div className="w-10 h-10 bg-zinc-800 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">🎸</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              {shows.length === 0
                ? 'No shows announced yet.'
                : 'No shows in this country.'}
            </p>
            {shows.length === 0 && (
              <p className="text-zinc-700 text-xs mt-4 max-w-sm mx-auto">
                Band leaders can add tour dates from their{' '}
                <Link href="/dashboard" className="text-red-500 hover:text-red-400">dashboard</Link>.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(grouped).map(([month, monthShows]) => (
              <div key={month}>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{month}</h2>
                <div className="flex flex-col gap-3">
                  {monthShows.map(show => {
                    const { day, month: mon, weekday } = formatDate(show.date)
                    return (
                      <div key={show.id}
                        className="border border-zinc-800 rounded-xl p-4 flex items-center gap-5 hover:border-zinc-700 transition-colors">

                        {/* Date block */}
                        <div className="shrink-0 text-center w-14">
                          <p className="text-2xl font-black leading-none">{day}</p>
                          <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-0.5">{mon}</p>
                          <p className="text-xs text-zinc-700 mt-0.5">{weekday}</p>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-10 bg-zinc-800 shrink-0" />

                        {/* Band logo */}
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {show.bands?.logo_url
                            ? <img src={show.bands.logo_url} alt={show.bands.name} className="w-full h-full object-cover" />
                            : <span className="text-lg opacity-20">🤘</span>}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/bands/${show.bands?.slug}`}
                            className="font-black uppercase tracking-wide text-sm hover:text-red-500 transition-colors">
                            {show.bands?.name}
                          </Link>
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">
                            {[
                              show.venue,
                              [show.city, show.country && countryToFlag(show.country)].filter(Boolean).join(' '),
                            ].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        {/* Ticket */}
                        {show.ticket_url && (
                          <a href={show.ticket_url} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 px-4 py-1.5 border border-zinc-700 hover:border-red-500 hover:text-white text-zinc-400 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">
                            Tickets
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
