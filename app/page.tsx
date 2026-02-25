'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '../lib/supabase'
import GlobalNav from '../components/GlobalNav'
import { useRouter } from 'next/navigation'

type Band = {
  id: string
  name: string
  slug: string
  country: string | null
  logo_url: string | null
  genre_ids: number[] | null
}

type TopRelease = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  avg: number
  band_name: string
  band_slug: string
}

type Genre = { id: number; name: string }

type RecentShow = {
  id: string
  date: string
  city: string
  country: string | null
  venue: string | null
  ticket_url: string | null
  bands: { name: string; slug: string; logo_url: string | null } | null
}

function parseShowDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ── VU Meter ──────────────────────────────────────────────────────────────────
// Vertical segmented LED bar, dual channel (stereo), Logic Pro style.
// score: 0–20. Colour zones match RatingDisplay on the band page:
//   segments 0–5  → red-400   (score < 10)
//   segments 6–8  → yellow-400 (score 10–14)
//   segments 9–11 → green-400  (score ≥ 15)
function VUMeter({ score }: { score: number }) {
  const SEGMENTS = 12
  const filled = Math.round((score / 20) * SEGMENTS)

  const segmentColor = (i: number, lit: boolean): string => {
    if (!lit) return '#27272a'
    if (i >= 9) return '#4ade80'  // green-400
    if (i >= 6) return '#facc15'  // yellow-400
    return '#f87171'              // red-400
  }

  return (
    <div className="flex gap-[3px] shrink-0">
      {[0, 1].map(bar => (
        <div key={bar} className="flex flex-col-reverse gap-[2px]">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 4,
                borderRadius: 1,
                backgroundColor: segmentColor(i, i < filled),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [username, setUsername] = useState<string | undefined>()
  const [recentBands, setRecentBands] = useState<Band[]>([])
  const [topReleases, setTopReleases] = useState<TopRelease[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [stats, setStats] = useState({ bands: 0, releases: 0, members: 0 })
  const [recentShows, setRecentShows] = useState<RecentShow[]>([])
  const [loading, setLoading] = useState(true)

  // Carousel state
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeCard, setActiveCard] = useState(0)
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user.id)
        const { data: profile } = await supabase
          .from('profiles').select('username').eq('id', user.id).single()
        if (profile) setUsername(profile.username)
      }

      const [
        { count: bandCount },
        { count: releaseCount },
        { count: memberCount },   // only profiles with a real account
        { data: genreData },
        { data: bandData },
        { data: allRatings },
      ] = await Promise.all([
        supabase.from('bands').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('releases').select('*', { count: 'exact', head: true }),
        supabase.from('band_members')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .not('profile_id', 'is', null),   // ← only real accounts
        supabase.from('genres_list').select('id, name'),
        supabase.from('bands')
          .select('id, name, slug, country, logo_url, genre_ids')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(9),
        supabase.from('ratings').select('release_id, score'),
      ])

      setStats({ bands: bandCount || 0, releases: releaseCount || 0, members: memberCount || 0 })
      if (genreData) setGenres(genreData)
      if (bandData) setRecentBands(bandData)

      // Compute top rated
      if (allRatings && allRatings.length > 0) {
        const ratingMap = new Map<string, { total: number; count: number }>()
        for (const r of allRatings) {
          const cur = ratingMap.get(r.release_id) || { total: 0, count: 0 }
          ratingMap.set(r.release_id, { total: cur.total + Number(r.score), count: cur.count + 1 })
        }
        const ranked = [...ratingMap.entries()]
          .map(([id, { total, count }]) => ({ id, avg: total / count, count }))
          .sort((a, b) => b.avg - a.avg || b.count - a.count)
          .slice(0, 6)

        const { data: releaseData } = await supabase
          .from('releases')
          .select('id, title, release_type, release_year, cover_url, bands(name, slug)')
          .in('id', ranked.map(x => x.id))

        if (releaseData) {
          const merged = ranked
            .map(({ id, avg }) => {
              const rel = releaseData.find((r: any) => r.id === id)
              if (!rel) return null
              return {
                id: rel.id,
                title: rel.title,
                release_type: rel.release_type,
                release_year: rel.release_year,
                cover_url: rel.cover_url,
                avg,
                band_name: (rel as any).bands?.name || '',
                band_slug: (rel as any).bands?.slug || '',
              }
            })
            .filter(Boolean) as TopRelease[]
          setTopReleases(merged)
        }
      }

      // Recently added shows (upcoming only)
      const today = new Date().toISOString().split('T')[0]
      const { data: showData } = await supabase
        .from('shows')
        .select('id, date, city, country, venue, ticket_url, bands(name, slug, logo_url)')
        .gte('date', today)
        .order('created_at', { ascending: false })
        .limit(6)
      if (showData) setRecentShows(showData as any)

      setLoading(false)
    }
    load()
  }, [])

  // Auto-advance carousel
  useEffect(() => {
    if (recentBands.length <= 3) return
    autoAdvanceRef.current = setInterval(() => {
      const el = carouselRef.current
      if (!el) return
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: el.scrollWidth / recentBands.length, behavior: 'smooth' })
      }
    }, 3500)
    return () => { if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current) }
  }, [recentBands])

  const handleCarouselScroll = () => {
    const el = carouselRef.current
    if (!el || recentBands.length === 0) return
    const cardW = el.scrollWidth / recentBands.length
    setActiveCard(Math.round(el.scrollLeft / cardW))
  }

  const scrollCarousel = (dir: 'prev' | 'next') => {
    const el = carouselRef.current
    if (!el) return
    // Reset auto-advance timer on manual interaction
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
    const cardW = el.scrollWidth / recentBands.length
    el.scrollBy({ left: dir === 'next' ? cardW : -cardW, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUsername(undefined)
    setCurrentUser(null)
    router.refresh()
  }

  const getBandGenres = (ids: number[] | null) => {
    if (!ids || ids.length === 0) return []
    return genres.filter(g => ids.includes(g.id))
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav currentUser={currentUser} username={username} onLogout={handleLogout} />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto">
        <p className="text-red-500 uppercase tracking-[0.3em] text-xs font-bold mb-6">
          For metalheads. By metalheads.
        </p>
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black uppercase leading-none tracking-tight mb-6">
          Your music.<br />
          <span className="text-red-500">Finally heard.</span>
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg max-w-lg mb-10 leading-relaxed text-justify">
          A home for bedroom and garage metal bands. Publish your music, build your profile, and get discovered by fans who already know what they're looking for.
        </p>
        <div className="flex gap-3 flex-wrap">
          {currentUser ? (
            <Link href="/dashboard"
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-red-700 transition-colors text-sm">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/register"
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-red-700 transition-colors text-sm">
              Create Band Profile
            </Link>
          )}
          <Link href="/explore"
            className="border border-zinc-700 text-zinc-300 px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:border-white hover:text-white transition-colors text-sm">
            Explore Bands
          </Link>
        </div>

        {/* Live stats */}
        {!loading && stats.bands > 0 && (
          <div className="flex items-center gap-8 mt-14 pt-8 border-t border-zinc-800">
            <div>
              <p className="text-3xl font-black">{stats.bands.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mt-0.5">
                Band{stats.bands !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <p className="text-3xl font-black">{stats.releases.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mt-0.5">
                Release{stats.releases !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <p className="text-3xl font-black">{stats.members.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mt-0.5">
                Member{stats.members !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Recently Added — Carousel ───────────────────────────────────────── */}
      <section className="border-t border-zinc-800 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500">Recently Added</h2>
            <div className="flex items-center gap-4">
              <Link href="/explore"
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
                View all →
              </Link>
              {recentBands.length > 3 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => scrollCarousel('prev')}
                    className="w-7 h-7 rounded-lg border border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-xs">
                    ‹
                  </button>
                  <button
                    onClick={() => scrollCarousel('next')}
                    className="w-7 h-7 rounded-lg border border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-xs">
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-zinc-900" />
                <div className="p-4 space-y-2">
                  <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : recentBands.length === 0 ? (
          <div className="px-6 max-w-5xl mx-auto">
            <p className="text-zinc-700 text-sm uppercase tracking-widest">No bands yet — be the first.</p>
          </div>
        ) : (
          <>
            {/* Scrollable strip — no visible scrollbar */}
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex gap-4 overflow-x-auto px-6"
              style={{
                scrollbarWidth: 'none',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                // WebkitOverflowScrolling needed for iOS momentum scroll
                WebkitOverflowScrolling: 'touch',
              } as React.CSSProperties}
            >
              {recentBands.map(band => {
                const bandGenres = getBandGenres(band.genre_ids)
                return (
                  <Link
                    key={band.id}
                    href={`/bands/${band.slug}`}
                    style={{ flex: '0 0 calc(33.333% - 11px)', scrollSnapAlign: 'start' }}
                    className="border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all group bg-zinc-950 min-w-[260px]"
                  >
                    <div className="aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
                      {band.logo_url
                        ? <img src={band.logo_url} alt={band.name}
                            className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-300" />
                        : <span className="text-5xl opacity-10">🤘</span>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors leading-tight">
                        {band.name}
                      </h3>
                      {band.country && (
                        <p className="text-xs text-zinc-600 mt-1">{band.country}</p>
                      )}
                      {bandGenres.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {bandGenres.slice(0, 2).map(g => (
                            <span key={g.id}
                              className="px-2 py-0.5 bg-black border border-zinc-800 rounded text-xs text-zinc-600">
                              {g.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Dot indicators */}
            {recentBands.length > 3 && (
              <div className="flex justify-center gap-1.5 mt-5 px-6">
                {recentBands.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const el = carouselRef.current
                      if (!el) return
                      const cardW = el.scrollWidth / recentBands.length
                      el.scrollTo({ left: cardW * i, behavior: 'smooth' })
                    }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === activeCard ? 'w-6 bg-red-500' : 'w-1.5 bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Top Rated ──────────────────────────────────────────────────────── */}
      {topReleases.length > 0 && (
        <section className="border-t border-zinc-800 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-8">Top Rated</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
              {topReleases.map(release => (
                <Link key={release.id} href={`/bands/${release.band_slug}`} className="group">
                  {/* Cover */}
                  <div className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 group-hover:border-zinc-600 transition-colors mb-3">
                    {release.cover_url
                      ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center opacity-10 text-3xl">🎵</div>}
                  </div>
                  {/* VU meter + info */}
                  <div className="flex gap-2.5 items-start">
                    <VUMeter score={release.avg} />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-black uppercase tracking-wide group-hover:text-red-500 transition-colors truncate leading-tight">
                        {release.title}
                      </p>
                      <p className="text-xs text-zinc-600 truncate mt-0.5">{release.band_name}</p>
                      <p className={`mt-1.5 text-xs font-black ${
                        release.avg >= 15 ? 'text-green-400' : release.avg >= 10 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {release.avg.toFixed(1)}<span className="text-zinc-700 font-normal">/20</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Recently Added Shows ────────────────────────────────────────────── */}
      {!loading && recentShows.length > 0 && (
        <section className="border-t border-zinc-800 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">Recently Added Shows</h2>
              <Link href="/shows" className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
                All shows →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentShows.map(show => {
                const d = parseShowDate(show.date)
                const day = String(d.getDate()).padStart(2, '0')
                const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
                const weekday = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()
                return (
                  <div key={show.id} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
                    {/* Date */}
                    <div className="text-center shrink-0 w-12">
                      <p className="text-2xl font-black leading-none">{day}</p>
                      <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-0.5">{month}</p>
                      <p className="text-xs text-zinc-700 mt-0.5">{weekday}</p>
                    </div>
                    <div className="w-px h-10 bg-zinc-800 shrink-0" />
                    {/* Band logo */}
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {show.bands?.logo_url
                        ? <img src={show.bands.logo_url} alt={show.bands.name} className="w-full h-full object-cover" />
                        : <span className="text-base opacity-20">🤘</span>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/bands/${show.bands?.slug}`}
                        className="text-xs font-black uppercase tracking-wide hover:text-red-500 transition-colors truncate block">
                        {show.bands?.name}
                      </Link>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {[show.venue, show.city, show.country].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {/* Ticket */}
                    {show.ticket_url && (
                      <a href={show.ticket_url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-red-500 px-2.5 py-1 rounded-lg transition-colors">
                        Tickets
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800 px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <p className="text-2xl mb-4">🎸</p>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2">Publish Your Music</h3>
            <p className="text-zinc-600 text-sm leading-relaxed text-justify">
              Create your band page, add releases, embed tracks from YouTube or SoundCloud. Your music, your way.
            </p>
          </div>
          <div>
            <p className="text-2xl mb-4">🔍</p>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2">Search by Influence</h3>
            <p className="text-zinc-600 text-sm leading-relaxed text-justify">
              Find bands influenced by Iron Maiden, Dream Theater, or any combination you can think of. Discover music you'll actually love.
            </p>
          </div>
          <div>
            <p className="text-2xl mb-4">🤘</p>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2">Built for Metal</h3>
            <p className="text-zinc-600 text-sm leading-relaxed text-justify">
              No algorithm. No playlist. A community built by metalheads, for metalheads. Every subgenre welcome.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA (logged-out only) ───────────────────────────────────── */}
      {!currentUser && !loading && (
        <section className="border-t border-zinc-800 px-6 py-20 text-center">
          <div className="max-w-lg mx-auto">
            <h2 className="text-4xl font-black uppercase tracking-tight mb-4">
              Ready to be heard?
            </h2>
            <p className="text-zinc-600 text-sm mb-8 text-justify">
              Free forever. No algorithms. Just metal.
            </p>
            <Link href="/register"
              className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-10 py-3.5 rounded-lg transition-colors">
              Create Band Profile
            </Link>
          </div>
        </section>
      )}

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-zinc-700 text-xs">
        © {new Date().getFullYear()} The Metalist — Built for metalheads
      </footer>
    </main>
  )
}
