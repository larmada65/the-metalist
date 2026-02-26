'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '../lib/supabase'
import GlobalNav from '../components/GlobalNav'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

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

type LatestRelease = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  band_name: string
  band_slug: string
}

type RecentReview = {
  id: string
  title: string
  content: string
  rating: number | null
  created_at: string
  author: string
  release_title: string
  release_cover: string | null
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

type UserBand = { name: string; slug: string; logo_url: string | null }

type Props = {
  initialUserId: string | null
  stats: { bands: number; releases: number; members: number }
  genres: Genre[]
  recentBands: Band[]
  latestReleases: LatestRelease[]
  topReleases: TopRelease[]
  recentReviews: RecentReview[]
  recentShows: RecentShow[]
}

function parseShowDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function VUMeter({ score }: { score: number }) {
  const SEGMENTS = 12
  const filled = Math.round((score / 20) * SEGMENTS)
  const segmentColor = (i: number, lit: boolean): string => {
    if (!lit) return '#27272a'
    if (i >= 9) return '#4ade80'
    if (i >= 6) return '#facc15'
    return '#f87171'
  }
  return (
    <div className="flex gap-[3px] shrink-0">
      {[0, 1].map(bar => (
        <div key={bar} className="flex flex-col-reverse gap-[2px]">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <div key={i} style={{ width: 5, height: 4, borderRadius: 1, backgroundColor: segmentColor(i, i < filled) }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function HomeClient({ initialUserId, stats, genres, recentBands, latestReleases, topReleases, recentReviews, recentShows }: Props) {
  const [currentUser, setCurrentUser] = useState<string | null>(initialUserId)
  const [username, setUsername] = useState<string | undefined>()
  const [userBand, setUserBand] = useState<UserBand | null>(null)
  const [authLoading, setAuthLoading] = useState(!initialUserId)

  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeCard, setActiveCard] = useState(0)
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!initialUserId) {
      setAuthLoading(false)
      return
    }

    const loadProfileAndBand = async () => {
      const userId = initialUserId
      const [{ data: profile }, { data: bandData }] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', userId).single(),
        supabase.from('bands').select('name, slug, logo_url').eq('user_id', userId).single(),
      ])
      if (profile) setUsername(profile.username)
      if (bandData) setUserBand(bandData)
      setAuthLoading(false)
    }

    loadProfileAndBand()
  }, [initialUserId, supabase])

  useEffect(() => {
    if (recentBands.length <= 3) return
    autoAdvanceRef.current = setInterval(() => {
      const el = carouselRef.current
      if (!el) return
      const cardWidth = el.scrollWidth / recentBands.length
      const nextScroll = el.scrollLeft + cardWidth
      el.scrollTo({ left: nextScroll >= el.scrollWidth - cardWidth ? 0 : nextScroll, behavior: 'smooth' })
    }, 4000)
    return () => { if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current) }
  }, [recentBands.length])

  const handleCarouselScroll = () => {
    const el = carouselRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / recentBands.length
    setActiveCard(Math.round(el.scrollLeft / cardWidth))
  }

  const scrollCarousel = (dir: 'prev' | 'next') => {
    const el = carouselRef.current
    if (!el) return
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
    el.scrollBy({ left: dir === 'next' ? el.scrollWidth / recentBands.length : -(el.scrollWidth / recentBands.length), behavior: 'smooth' })
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
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-display uppercase leading-none tracking-tight mb-6">
          {!authLoading && currentUser ? (
            <>Welcome<br /><span className="text-red-500">back{username ? `, ${username}` : ''}.</span></>
          ) : (
            <>Your music.<br /><span className="text-red-500">Finally heard.</span></>
          )}
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg max-w-lg mb-10 leading-relaxed min-h-[3.5rem]">
          {!authLoading
            ? currentUser
              ? 'Your community is active. Check what\'s new in your feed, or head to your dashboard.'
              : 'A home for metal bands and the fans who love them. Publish your music, rate releases, follow bands, and discover something new.'
            : <span className="block space-y-2"><span className="block h-4 bg-zinc-900 rounded animate-pulse w-full" /><span className="block h-4 bg-zinc-900 rounded animate-pulse w-3/4" /></span>
          }
        </p>

        {/* Hero CTAs */}
        {!authLoading && currentUser ? (
          <div className="flex gap-3 flex-wrap">
            <Link href="/feed"
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-red-700 transition-colors text-sm">
              My Feed
            </Link>
            <Link href="/dashboard"
              className="border border-zinc-700 text-zinc-300 px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:border-white hover:text-white transition-colors text-sm">
              Dashboard
            </Link>
            {userBand && (
              <Link href={`/bands/${userBand.slug}`}
                className="border border-zinc-800 text-zinc-500 px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:border-zinc-700 hover:text-zinc-300 transition-colors text-sm flex items-center gap-2">
                {userBand.logo_url && (
                  <img src={userBand.logo_url} alt={userBand.name} className="w-5 h-5 rounded object-cover" />
                )}
                {userBand.name}
              </Link>
            )}
          </div>
        ) : !authLoading ? (
          <div className="flex gap-3 flex-wrap">
            <Link href="/register"
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-red-700 transition-colors text-sm">
              Join Free
            </Link>
            <Link href="/explore"
              className="border border-zinc-700 text-zinc-300 px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:border-white hover:text-white transition-colors text-sm">
              Browse Bands
            </Link>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="h-11 w-28 bg-zinc-900 rounded-lg animate-pulse" />
            <div className="h-11 w-36 bg-zinc-900 rounded-lg animate-pulse" />
          </div>
        )}

        {/* Live stats */}
        {stats.bands > 0 && (
          <div className="flex items-center flex-wrap gap-6 sm:gap-8 mt-14 pt-8 border-t border-zinc-800">
            <div>
              <p className="text-3xl font-black tabular">{stats.bands.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mt-0.5">Band{stats.bands !== 1 ? 's' : ''}</p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-zinc-800" />
            <div>
              <p className="text-3xl font-black tabular">{stats.releases.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mt-0.5">Release{stats.releases !== 1 ? 's' : ''}</p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-zinc-800" />
            <div>
              <p className="text-3xl font-black tabular">{stats.members.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mt-0.5">Member{stats.members !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </section>

      {/* ── Recently Added Bands — Carousel ─────────────────────────────────── */}
      <section className="border-t border-zinc-800 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500">New Bands</h2>
            <p className="hidden sm:block text-xs text-zinc-600 ml-4">
              Fresh profiles from bands that just joined The Metalist.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/explore" className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
                All bands →
              </Link>
              {recentBands.length > 3 && (
                <div className="flex gap-1.5">
                  <button onClick={() => scrollCarousel('prev')}
                    className="w-7 h-7 rounded-lg border border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-xs">‹</button>
                  <button onClick={() => scrollCarousel('next')}
                    className="w-7 h-7 rounded-lg border border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-xs">›</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {recentBands.length === 0 ? (
          <div className="px-6 max-w-5xl mx-auto">
            <p className="text-zinc-700 text-sm uppercase tracking-widest">No bands yet. Be the first to raise the horns.</p>
          </div>
        ) : (
          <>
            <div ref={carouselRef} onScroll={handleCarouselScroll}
              className="flex gap-4 overflow-x-auto px-6"
              style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {recentBands.map(band => {
                const bandGenres = getBandGenres(band.genre_ids)
                return (
                  <Link
                    key={band.id}
                    href={`/bands/${band.slug}`}
                    style={{ flex: '0 0 calc(33.333% - 11px)', scrollSnapAlign: 'start' }}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 hover:bg-zinc-900 hover:-translate-y-0.5 transition-all group min-w-[260px]"
                  >
                    <div className="aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
                      {band.logo_url
                        ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-300" />
                        : <span className="text-5xl opacity-10">🤘</span>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors leading-tight">{band.name}</h3>
                      {band.country && <p className="text-xs text-zinc-600 mt-1">{band.country}</p>}
                      {bandGenres.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {bandGenres.slice(0, 2).map(g => (
                            <span key={g.id} className="px-2 py-0.5 bg-black border border-zinc-800 rounded text-xs text-zinc-600">{g.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
            {recentBands.length > 3 && (
              <div className="flex justify-center gap-1.5 mt-5 px-6">
                {recentBands.map((_, i) => (
                  <button key={i}
                    onClick={() => {
                      const el = carouselRef.current
                      if (!el) return
                      el.scrollTo({ left: (el.scrollWidth / recentBands.length) * i, behavior: 'smooth' })
                    }}
                    className={`h-1 rounded-full transition-all duration-300 ${i === activeCard ? 'w-6 bg-red-500' : 'w-1.5 bg-zinc-700'}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Latest Releases ──────────────────────────────────────────────────── */}
      {latestReleases.length > 0 && (
        <section className="border-t border-zinc-800 px-6 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500">Latest Releases</h2>
                <p className="text-xs text-zinc-600 mt-1">
                  New albums, EPs and singles added most recently.
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {latestReleases.map(release => (
                <Link key={release.id} href={`/releases/${release.id}`} className="group">
                  <div className="aspect-square bg-zinc-900 overflow-hidden border border-zinc-800 group-hover:border-zinc-700 group-hover:bg-zinc-900 transition-colors mb-2.5">
                    {release.cover_url
                      ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center opacity-10 text-3xl">🎵</div>}
                  </div>
                  <p className="text-xs font-black uppercase tracking-wide group-hover:text-red-500 transition-colors truncate leading-tight">
                    {release.title}
                  </p>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">{release.band_name}</p>
                  <p className="text-xs text-zinc-700 mt-0.5">{release.release_type}{release.release_year ? ` · ${release.release_year}` : ''}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Top Rated ────────────────────────────────────────────────────────── */}
      {topReleases.length > 0 && (
        <section className="border-t border-zinc-800 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500">Top Rated</h2>
                <p className="text-xs text-zinc-600 mt-1">
                  Highest average ratings from the community on a 0–20 scale.
                </p>
              </div>
              <Link href="/rankings" className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest ml-4">
                Full rankings →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
              {topReleases.map(release => (
                <Link key={release.id} href={`/releases/${release.id}`} className="group">
                  <div className="aspect-square bg-zinc-900 overflow-hidden border border-zinc-800 group-hover:border-zinc-700 group-hover:bg-zinc-900 transition-colors mb-3">
                    {release.cover_url
                      ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center opacity-10 text-3xl">🎵</div>}
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <VUMeter score={release.avg} />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-black uppercase tracking-wide group-hover:text-red-500 transition-colors truncate leading-tight">{release.title}</p>
                      <p className="text-xs text-zinc-600 truncate mt-0.5">{release.band_name}</p>
                      <p className={`mt-1.5 text-xs font-black ${release.avg >= 15 ? 'text-green-400' : release.avg >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
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

      {/* ── Upcoming Shows ───────────────────────────────────────────────────── */}
      {recentShows.length > 0 && (
        <section className="border-t border-zinc-800 px-6 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500">Upcoming Shows</h2>
                <p className="text-xs text-zinc-600 mt-1">
                  Tour dates and one-off gigs announced by bands.
                </p>
              </div>
              <Link href="/shows" className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest ml-4">
                All shows →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentShows.map(show => {
                const d = parseShowDate(show.date)
                const day = String(d.getDate()).padStart(2, '0')
                const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
                const weekday = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()
                return (
                  <div key={show.id} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-2xl font-black leading-none">{day}</p>
                      <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-0.5">{month}</p>
                      <p className="text-xs text-zinc-700 mt-0.5">{weekday}</p>
                    </div>
                    <div className="w-px h-10 bg-zinc-800 shrink-0" />
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {show.bands?.logo_url
                        ? <img src={show.bands.logo_url} alt={show.bands.name} className="w-full h-full object-cover" />
                        : <span className="text-base opacity-20">🤘</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/bands/${show.bands?.slug}`}
                        className="text-xs font-black uppercase tracking-wide hover:text-red-500 transition-colors truncate block">
                        {show.bands?.name}
                      </Link>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {[show.venue, show.city, show.country].filter(Boolean).join(' · ')}
                      </p>
                    </div>
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

      {/* ── Recent Reviews ───────────────────────────────────────────────────── */}
      {recentReviews.length > 0 && (
        <section className="border-t border-zinc-800 px-6 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500">Recent Reviews</h2>
                <p className="text-xs text-zinc-600 mt-1">
                  What Metalist members are saying about new releases.
                </p>
              </div>
            <Link href="/reviews" className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest ml-4">
              All reviews →
            </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentReviews.map(review => (
                <Link key={review.id} href={`/reviews/${review.id}`}
                  className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group flex flex-col gap-3 bg-zinc-950">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {review.release_cover
                        ? <img src={review.release_cover} alt={review.release_title} className="w-full h-full object-cover" />
                        : <span className="text-xl opacity-20">🎵</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold truncate">{review.band_name}</p>
                      <p className="text-xs text-zinc-700 truncate">{review.release_title}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p className="text-sm font-black uppercase tracking-wide group-hover:text-red-500 transition-colors">
                        {review.title}
                      </p>
                      {review.rating !== null && (
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded border shrink-0 ${
                          review.rating >= 15 ? 'text-green-400 bg-green-950/40 border-green-900/50'
                          : review.rating >= 10 ? 'text-yellow-400 bg-yellow-950/40 border-yellow-900/50'
                          : 'text-red-400 bg-red-950/40 border-red-900/50'
                        }`}>{review.rating.toFixed(1)}/20</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{review.content}</p>
                  </div>
                  <p className="text-xs text-zinc-700 mt-auto">
                    by <span className="text-zinc-500">{review.author}</span>
                    <span className="mx-1.5">·</span>
                    {timeAgo(review.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800 px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <p className="text-2xl mb-4">🎸</p>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2">Publish Your Music</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Create your band page, add releases with full track listings, embed audio from YouTube or SoundCloud.
            </p>
          </div>
          <div>
            <p className="text-2xl mb-4">🔍</p>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2">Search by Influence</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Find bands influenced by Iron Maiden, Dream Theater, or any combination. Discover music you'll actually love.
            </p>
          </div>
          <div>
            <p className="text-2xl mb-4">🤘</p>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2">Built for Metal</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              No algorithm. No playlist. Ratings, reviews, and a community built by metalheads. Every subgenre welcome.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA (logged-out only) ─────────────────────────────────────── */}
      {!authLoading && !currentUser && (
        <section className="border-t border-zinc-800 px-6 py-20 text-center">
          <div className="max-w-lg mx-auto">
            <h2 className="text-4xl font-display uppercase tracking-tight mb-4">Ready to be heard?</h2>
            <p className="text-zinc-600 text-sm mb-8">Built for metalheads. No algorithms. Just metal.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/register"
                className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-10 py-3.5 rounded-lg transition-colors">
                Create Band Profile
              </Link>
              <Link href="/explore"
                className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white font-bold uppercase tracking-widest px-10 py-3.5 rounded-lg transition-colors">
                Browse Bands
              </Link>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-zinc-700 text-xs">
        © {new Date().getFullYear()} The Metalist — Built for metalheads
      </footer>
    </main>
  )
}
