'use client'
import { useState } from 'react'
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

type Props = {
  releases: Release[]
  genres: Genre[]
}

export default function ReleasesClient({ releases, genres }: Props) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)

  const releaseTypes = [...new Set(releases.map(r => r.release_type))].sort()

  const activeGenres = genres.filter(g =>
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
          <h1 className="text-5xl font-display uppercase tracking-tight mb-2">Releases</h1>
          <p className="text-zinc-600 text-sm">
            All albums, EPs, and singles from bands on the platform, newest first.
          </p>
        </div>

        {/* Stats */}
        {releases.length > 0 && (
          <div className="flex flex-wrap gap-6 md:gap-10 mb-10 border-b border-zinc-800 pb-8">
            <div>
              <p className="text-3xl font-black tabular">{releases.length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Releases</p>
            </div>
            {releaseTypes.map(type => (
              <div key={type}>
                <p className="text-3xl font-black tabular">{releases.filter(r => r.release_type === type).length}</p>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">{type}s</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
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

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">💿</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              {releases.length === 0 ? 'The silence is deafening. No releases yet.' : 'Nothing matches these filters. Try a different combo.'}
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
                className="border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/60 transition-all group flex flex-col">

                {/* Cover */}
                <div className="aspect-square bg-zinc-900 overflow-hidden relative">
                  {release.cover_url
                    ? <img src={release.cover_url} alt={release.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                  }
                  {release.avgRating !== null && (
                    <div className={`absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded border ${ratingColor(release.avgRating)}`}>
                      {release.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <p className="font-display uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors line-clamp-1">
                    {release.title}
                  </p>
                  {release.bands && (
                    <p className="text-xs text-zinc-500 truncate">{release.bands.name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 uppercase tracking-widest">
                      {release.release_type}
                    </span>
                    {release.release_year && (
                      <span className="text-xs text-zinc-600">{release.release_year}</span>
                    )}
                    {release.ratingCount > 0 && (
                      <span className="text-xs text-zinc-600 ml-auto">
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
