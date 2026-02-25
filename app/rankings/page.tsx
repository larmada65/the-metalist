'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Genre = { id: number; name: string }

type RatedRelease = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  avg: number
  ratingCount: number
  band_id: string
  band_name: string
  band_slug: string
  band_genre_ids: number[] | null
}

type FollowedBand = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  country: string | null
  genre_ids: number[] | null
  followCount: number
}

type ActiveBand = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  country: string | null
  genre_ids: number[] | null
  releaseCount: number
}

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? 'text-amber-400' :
    rank === 2 ? 'text-zinc-400' :
    rank === 3 ? 'text-orange-500' :
    'text-zinc-700'
  return (
    <span className={`font-black text-sm w-6 text-right shrink-0 ${cls}`}>
      {rank}
    </span>
  )
}

// ── Score bar (horizontal, for top-rated list) ────────────────────────────────
function ScoreBar({ avg }: { avg: number }) {
  const pct = (avg / 20) * 100
  const color =
    avg >= 15 ? '#4ade80' :
    avg >= 10 ? '#facc15' :
    '#f87171'
  const textCls =
    avg >= 15 ? 'text-green-400' :
    avg >= 10 ? 'text-yellow-400' :
    'text-red-400'
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className={`text-sm font-black w-8 text-right ${textCls}`}>{avg.toFixed(1)}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Rankings() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)

  const [allRated, setAllRated] = useState<RatedRelease[]>([])
  const [allFollowed, setAllFollowed] = useState<FollowedBand[]>([])
  const [allActive, setAllActive] = useState<ActiveBand[]>([])

  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [
        { data: genreData },
        { data: allRatings },
        { data: followData },
        { data: releaseData },
        { data: bandData },
      ] = await Promise.all([
        supabase.from('genres_list').select('id, name').order('name'),
        supabase.from('ratings').select('release_id, score'),
        supabase.from('follows').select('band_id'),
        supabase.from('releases').select('id, title, release_type, release_year, cover_url, band_id'),
        supabase.from('bands')
          .select('id, name, slug, logo_url, country, genre_ids')
          .eq('is_published', true),
      ])

      if (genreData) setGenres(genreData)

      const bands = bandData || []
      const releases = releaseData || []

      // ── Top Rated ──────────────────────────────────────────────────────────
      const ratingMap = new Map<string, { total: number; count: number }>()
      for (const r of allRatings || []) {
        const cur = ratingMap.get(r.release_id) || { total: 0, count: 0 }
        ratingMap.set(r.release_id, { total: cur.total + Number(r.score), count: cur.count + 1 })
      }
      const rated: RatedRelease[] = [...ratingMap.entries()]
        .map(([id, { total, count }]) => {
          const rel = releases.find(r => r.id === id)
          const band = bands.find(b => b.id === rel?.band_id)
          if (!rel || !band) return null
          return {
            id: rel.id,
            title: rel.title,
            release_type: rel.release_type,
            release_year: rel.release_year,
            cover_url: rel.cover_url,
            avg: total / count,
            ratingCount: count,
            band_id: band.id,
            band_name: band.name,
            band_slug: band.slug,
            band_genre_ids: band.genre_ids,
          }
        })
        .filter(Boolean) as RatedRelease[]
      rated.sort((a, b) => b.avg - a.avg || b.ratingCount - a.ratingCount)
      setAllRated(rated)

      // ── Most Followed ──────────────────────────────────────────────────────
      const followCount = new Map<string, number>()
      for (const f of followData || []) {
        followCount.set(f.band_id, (followCount.get(f.band_id) || 0) + 1)
      }
      const followed: FollowedBand[] = [...followCount.entries()]
        .map(([band_id, count]) => {
          const band = bands.find(b => b.id === band_id)
          if (!band) return null
          return { ...band, followCount: count }
        })
        .filter(Boolean) as FollowedBand[]
      followed.sort((a, b) => b.followCount - a.followCount)
      setAllFollowed(followed)

      // ── Most Active ────────────────────────────────────────────────────────
      const relCount = new Map<string, number>()
      for (const r of releases) {
        relCount.set(r.band_id, (relCount.get(r.band_id) || 0) + 1)
      }
      const active: ActiveBand[] = [...relCount.entries()]
        .map(([band_id, count]) => {
          const band = bands.find(b => b.id === band_id)
          if (!band) return null
          return { ...band, releaseCount: count }
        })
        .filter(Boolean) as ActiveBand[]
      active.sort((a, b) => b.releaseCount - a.releaseCount)
      setAllActive(active)

      setLoading(false)
    }
    load()
  }, [])

  // Genre filtering
  const filterRated = selectedGenre
    ? allRated.filter(r => r.band_genre_ids?.includes(selectedGenre))
    : allRated
  const filterFollowed = selectedGenre
    ? allFollowed.filter(b => b.genre_ids?.includes(selectedGenre))
    : allFollowed
  const filterActive = selectedGenre
    ? allActive.filter(b => b.genre_ids?.includes(selectedGenre))
    : allActive

  const topRated   = filterRated.slice(0, 10)
  const topFollowed = filterFollowed.slice(0, 10)
  const topActive  = filterActive.slice(0, 10)

  const rowBase = 'flex items-center gap-4 py-3 border-b border-zinc-800/60 last:border-0'

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Bands" />

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <h1 className="text-5xl font-black uppercase tracking-tight mb-2">
          Rankings
        </h1>
        <p className="text-zinc-600 text-sm mb-10 text-justify">
          Top rated releases, most followed bands, and most active artists on the platform.
        </p>

        {/* Genre filter */}
        <div
          className="flex gap-2 overflow-x-auto pb-3 mb-12"
          style={{ scrollbarWidth: 'none' }}
        >
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 ${
              selectedGenre === null
                ? 'bg-red-600 text-white'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            All Genres
          </button>
          {genres.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(prev => prev === g.id ? null : g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 ${
                selectedGenre === g.id
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-12">
            {[1, 2, 3].map(s => (
              <div key={s}>
                <div className="h-3 w-40 bg-zinc-800 rounded animate-pulse mb-6" />
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-zinc-800/60">
                    <div className="w-6 h-4 bg-zinc-800 rounded animate-pulse" />
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-zinc-800 rounded w-2/3 animate-pulse" />
                      <div className="h-3 bg-zinc-800 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-16">

            {/* ── Top Rated Releases ──────────────────────────────────────── */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Top Rated Releases</h2>
              <p className="text-zinc-700 text-xs mb-5">Ranked by average rating · 0–20 scale</p>
              {topRated.length === 0 ? (
                <p className="text-zinc-700 text-sm uppercase tracking-widest">No rated releases yet.</p>
              ) : (
                <div>
                  {topRated.map((rel, i) => (
                    <Link key={rel.id} href={`/bands/${rel.band_slug}`}
                      className={`${rowBase} hover:bg-zinc-950 transition-colors rounded-lg px-2 -mx-2 group`}>
                      <RankBadge rank={i + 1} />
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {rel.cover_url
                          ? <img src={rel.cover_url} alt={rel.title} className="w-full h-full object-cover" />
                          : <span className="text-lg opacity-20">🎵</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate group-hover:text-red-500 transition-colors">
                          {rel.title}
                        </p>
                        <p className="text-xs text-zinc-600 truncate mt-0.5">
                          {rel.band_name}
                          {rel.release_type ? ` · ${rel.release_type}` : ''}
                          {rel.release_year ? ` · ${rel.release_year}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-zinc-700 hidden sm:block">
                          {rel.ratingCount} rating{rel.ratingCount !== 1 ? 's' : ''}
                        </span>
                        <ScoreBar avg={rel.avg} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ── Most Followed Bands ─────────────────────────────────────── */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Most Followed</h2>
              <p className="text-zinc-700 text-xs mb-5">Bands with the most followers on the platform</p>
              {topFollowed.length === 0 ? (
                <p className="text-zinc-700 text-sm uppercase tracking-widest">No follows recorded yet.</p>
              ) : (
                <div>
                  {topFollowed.map((band, i) => (
                    <Link key={band.id} href={`/bands/${band.slug}`}
                      className={`${rowBase} hover:bg-zinc-950 transition-colors rounded-lg px-2 -mx-2 group`}>
                      <RankBadge rank={i + 1} />
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {band.logo_url
                          ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                          : <span className="text-lg opacity-20">🤘</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate group-hover:text-red-500 transition-colors">
                          {band.name}
                        </p>
                        {band.country && (
                          <p className="text-xs text-zinc-600 mt-0.5">{band.country}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black">{band.followCount.toLocaleString()}</p>
                        <p className="text-xs text-zinc-700">follower{band.followCount !== 1 ? 's' : ''}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ── Most Active ─────────────────────────────────────────────── */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Most Active</h2>
              <p className="text-zinc-700 text-xs mb-5">Bands with the most releases published</p>
              {topActive.length === 0 ? (
                <p className="text-zinc-700 text-sm uppercase tracking-widest">No releases yet.</p>
              ) : (
                <div>
                  {topActive.map((band, i) => (
                    <Link key={band.id} href={`/bands/${band.slug}`}
                      className={`${rowBase} hover:bg-zinc-950 transition-colors rounded-lg px-2 -mx-2 group`}>
                      <RankBadge rank={i + 1} />
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {band.logo_url
                          ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                          : <span className="text-lg opacity-20">🤘</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate group-hover:text-red-500 transition-colors">
                          {band.name}
                        </p>
                        {band.country && (
                          <p className="text-xs text-zinc-600 mt-0.5">{band.country}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black">{band.releaseCount}</p>
                        <p className="text-xs text-zinc-700">release{band.releaseCount !== 1 ? 's' : ''}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </main>
  )
}
