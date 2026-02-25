'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Release = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  created_at: string
  avgRating: number | null
  ratingCount: number
  bands: {
    name: string
    slug: string
    logo_url: string | null
    genre_ids: number[] | null
  } | null
}

type Genre = { id: number; name: string }

function ratingColor(r: number) {
  if (r >= 15) return 'text-green-400 border-green-900/50 bg-green-950/40'
  if (r >= 10) return 'text-yellow-400 border-yellow-900/50 bg-yellow-950/40'
  return 'text-red-400 border-red-900/50 bg-red-950/40'
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: releaseData }, { data: ratingData }, { data: genreData }] = await Promise.all([
        supabase
          .from('releases')
          .select('id, title, release_type, release_year, cover_url, created_at, bands(name, slug, logo_url, genre_ids)')
          .order('created_at', { ascending: false }),
        supabase.from('ratings').select('release_id, score'),
        supabase.from('genres_list').select('id, name').order('name'),
      ])

      if (releaseData) {
        // Compute avg rating per release
        const ratingMap: Record<string, number[]> = {}
        ratingData?.forEach((r: any) => {
          if (!ratingMap[r.release_id]) ratingMap[r.release_id] = []
          ratingMap[r.release_id].push(r.score)
        })

        setReleases(releaseData.map((r: any) => {
          const scores = ratingMap[r.id] || []
          return {
            ...r,
            avgRating: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null,
            ratingCount: scores.length,
          }
        }))
      }

      if (genreData) setAllGenres(genreData)
      setLoading(false)
    }
    load()
  }, [])

  const releaseTypes = [...new Set(releases.map(r => r.release_type))].sort()

  const activeGenres = allGenres.filter(g =>
    releases.some(r => r.bands?.genre_ids?.includes(g.id))
  )

  const filtered = releases
    .filter(r => !selectedType || r.release_type === selectedType)
    .filter(r => !selectedGenre || (r.bands?.genre_ids?.includes(selectedGenre) ?? false))

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
      active
        ? 'bg-red-600 border-red-600 text-white'
        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
    }`

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Bands" />

      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-black uppercase tracking-tight mb-2">Releases</h1>
          <p className="text-zinc-600 text-sm">
            All albums, EPs, and singles from bands on the platform, newest first.
          </p>
        </div>

        {/* Stats */}
        {!loading && releases.length > 0 && (
          <div className="flex gap-10 mb-10 border-b border-zinc-800 pb-8">
            <div>
              <p className="text-3xl font-black">{releases.length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Releases</p>
            </div>
            {releaseTypes.map(type => (
              <div key={type}>
                <p className="text-3xl font-black">{releases.filter(r => r.release_type === type).length}</p>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">{type}s</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {!loading && (
          <div className="flex flex-col gap-3 mb-8">
            {releaseTypes.length > 1 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-zinc-600 uppercase tracking-widest shrink-0">Type:</span>
                <button onClick={() => setSelectedType(null)} className={pillClass(selectedType === null)}>All</button>
                {releaseTypes.map(type => (
                  <button key={type} onClick={() => setSelectedType(prev => prev === type ? null : type)}
                    className={pillClass(selectedType === type)}>
                    {type}
                  </button>
                ))}
              </div>
            )}
            {activeGenres.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-zinc-600 uppercase tracking-widest shrink-0">Genre:</span>
                <button onClick={() => setSelectedGenre(null)} className={pillClass(selectedGenre === null)}>All</button>
                {activeGenres.map(g => (
                  <button key={g.id} onClick={() => setSelectedGenre(prev => prev === g.id ? null : g.id)}
                    className={pillClass(selectedGenre === g.id)}>
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="aspect-square bg-zinc-800 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-zinc-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">💿</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              {releases.length === 0 ? 'No releases yet.' : 'No results for these filters.'}
            </p>
            {(selectedType || selectedGenre) && (
              <button onClick={() => { setSelectedType(null); setSelectedGenre(null) }}
                className="mt-4 text-xs text-red-500 hover:text-red-400 transition-colors">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(release => (
              <Link key={release.id} href={`/releases/${release.id}`}
                className="border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all group flex flex-col">

                {/* Cover */}
                <div className="aspect-square bg-zinc-900 overflow-hidden relative">
                  {release.cover_url
                    ? <img src={release.cover_url} alt={release.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                  }
                  {/* Rating badge */}
                  {release.avgRating !== null && (
                    <div className={`absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded border ${ratingColor(release.avgRating)}`}>
                      {release.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors line-clamp-1">
                    {release.title}
                  </p>
                  {release.bands && (
                    <p className="text-xs text-zinc-500 truncate">{release.bands.name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <span className="text-xs text-zinc-700 uppercase tracking-widest">{release.release_type}</span>
                    {release.release_year && (
                      <span className="text-xs text-zinc-700">{release.release_year}</span>
                    )}
                    {release.ratingCount > 0 && (
                      <span className="text-xs text-zinc-700 ml-auto">
                        {release.ratingCount} rating{release.ratingCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
