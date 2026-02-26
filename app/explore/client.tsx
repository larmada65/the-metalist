'use client'
import { useState } from 'react'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Band = {
  id: string
  name: string
  slug: string
  country: string | null
  year_formed: number | null
  genre_ids: number[] | null
  logo_url: string | null
}

type Influence = { id: number; name: string }
type Genre = { id: number; name: string }

type Props = {
  bands: Band[]
  genres: Genre[]
  influences: Influence[]
  bandInfluences: { band_id: string; influence_id: number }[]
  followerCounts: Record<string, number>
  initialGenreId: number | null
  initialInfluenceId: number | null
}

export default function ExploreClient({
  bands,
  genres,
  influences,
  bandInfluences,
  followerCounts,
  initialGenreId,
  initialInfluenceId,
}: Props) {
  const [selectedInfluences, setSelectedInfluences] = useState<number[]>(
    initialInfluenceId ? [initialInfluenceId] : []
  )
  const [selectedGenres, setSelectedGenres] = useState<number[]>(
    initialGenreId ? [initialGenreId] : []
  )
  const [influenceSearch, setInfluenceSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Build a Set of band IDs per influence for O(1) lookup
  const influenceBandIds = (influenceId: number) =>
    new Set(
      bandInfluences
        .filter(bi => bi.influence_id === influenceId)
        .map(bi => bi.band_id)
    )

  const toggleInfluence = (id: number) =>
    setSelectedInfluences(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const toggleGenre = (id: number) =>
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  // Filter bands in memory
  let filtered = bands
  if (selectedInfluences.length > 0) {
    const bandIdSets = selectedInfluences.map(influenceBandIds)
    filtered = filtered.filter(b =>
      bandIdSets.every(set => set.has(b.id))
    )
  }
  if (selectedGenres.length > 0) {
    filtered = filtered.filter(b =>
      selectedGenres.every(gId => b.genre_ids?.includes(gId))
    )
  }

  const filteredInfluences = influences.filter(i =>
    i.name.toLowerCase().includes(influenceSearch.toLowerCase())
  )

  const getBandGenres = (genreIds: number[] | null) => {
    if (!genreIds || genreIds.length === 0) return []
    return genres.filter(g => genreIds.includes(g.id))
  }

  const totalFilters = selectedInfluences.length + selectedGenres.length

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/" backLabel="Home" />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Mobile filter toggle */}
        <div className="md:hidden mb-4 flex items-center gap-3">
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="flex items-center gap-2 text-xs uppercase tracking-widest border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 hover:border-zinc-500 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            Filters
            {totalFilters > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full px-1.5 leading-5 min-w-[20px] text-center">
                {totalFilters}
              </span>
            )}
          </button>
          {totalFilters > 0 && (
            <button
              onClick={() => { setSelectedInfluences([]); setSelectedGenres([]) }}
              className="text-xs text-red-500 hover:text-red-400 transition-colors">
              Clear all
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-8 md:gap-10">
        {/* Sidebar filters */}
        <aside className={`w-full md:w-72 md:shrink-0 md:block ${filtersOpen ? 'block' : 'hidden'}`}>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Filter by Influence</h2>
          <input
            type="text"
            value={influenceSearch}
            onChange={e => setInfluenceSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors mb-3"
            placeholder="Search influences..."
          />
          {selectedInfluences.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedInfluences.map(id => {
                const inf = influences.find(i => i.id === id)
                return inf ? (
                  <button key={id} onClick={() => toggleInfluence(id)}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors">
                    {inf.name} ✕
                  </button>
                ) : null
              })}
            </div>
          )}
          <div className="flex flex-col gap-1 max-h-40 md:max-h-64 overflow-y-auto">
            {filteredInfluences.filter(i => !selectedInfluences.includes(i.id)).map(i => (
              <button key={i.id} onClick={() => toggleInfluence(i.id)}
                className="text-left px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors">
                {i.name}
              </button>
            ))}
          </div>

          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 mt-8">Filter by Genre</h2>
          <div className="flex flex-wrap gap-1.5">
            {genres.map(g => (
              <button key={g.id} onClick={() => toggleGenre(g.id)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedGenres.includes(g.id)
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>
                {g.name}
              </button>
            ))}
          </div>

          {(selectedInfluences.length > 0 || selectedGenres.length > 0) && (
            <button
              onClick={() => { setSelectedInfluences([]); setSelectedGenres([]) }}
              className="mt-6 text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
              Clear all filters
            </button>
          )}
        </aside>

        {/* Band list */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tight">
              {selectedInfluences.length > 0 || selectedGenres.length > 0 ? 'Search Results' : 'All Bands'}
            </h1>
            <span className="text-zinc-600 text-sm">
              {filtered.length} band{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="border border-zinc-800 rounded p-16 text-center text-zinc-600">
              <p className="text-4xl mb-4">🔍</p>
              <p className="uppercase tracking-widest text-sm">No bands found</p>
              <p className="text-xs mt-2">Try different filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map(band => (
                <Link key={band.id} href={`/bands/${band.slug}`}
                  className="border border-zinc-800 rounded p-6 bg-zinc-950 hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/60 transition-all flex items-center gap-6 group">
                  <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {band.logo_url
                      ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">🤘</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-display uppercase tracking-wide group-hover:text-red-500 transition-colors">
                      {band.name}
                    </h3>
                    <div className="flex gap-3 text-xs text-zinc-600 mt-1 flex-wrap">
                      {band.country && <span>{band.country}</span>}
                      {band.year_formed && <span>Est. {band.year_formed}</span>}
                      {(followerCounts[band.id] || 0) > 0 && (
                        <span className="text-zinc-500">
                          {followerCounts[band.id]} follower{followerCounts[band.id] !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {getBandGenres(band.genre_ids).slice(0, 3).map(g => (
                        <span key={g.id}
                          className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-500">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-zinc-700 group-hover:text-red-500 transition-colors text-xl">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </main>
  )
}
