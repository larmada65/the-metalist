'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
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

function ExploreContent() {
  const [bands, setBands] = useState<Band[]>([])
  const [influences, setInfluences] = useState<Influence[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const [selectedInfluences, setSelectedInfluences] = useState<number[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [influenceSearch, setInfluenceSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({})
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: inf } = await supabase.from('influences_list').select('*').order('name')
      const { data: gen } = await supabase.from('genres_list').select('*').order('name')
      if (inf) setInfluences(inf)
      if (gen) setAllGenres(gen)

      const urlInfluence = searchParams.get('influence')
      if (urlInfluence) setSelectedInfluences([parseInt(urlInfluence)])
    }
    load()
  }, [])

  useEffect(() => {
    fetchBands()
  }, [selectedInfluences, selectedGenres])

  const fetchBands = async () => {
    setLoading(true)

    if (selectedInfluences.length > 0) {
      let bandIds: string[] | null = null
      for (const infId of selectedInfluences) {
        const { data } = await supabase
          .from('band_influences')
          .select('band_id')
          .eq('influence_id', infId)
        const ids = data?.map((d: any) => d.band_id) || []
        bandIds = bandIds === null ? ids : bandIds.filter(id => ids.includes(id))
      }

      if (!bandIds || bandIds.length === 0) { setBands([]); setLoading(false); return }

      let query = supabase.from('bands').select('*').eq('is_published', true).in('id', bandIds)
      if (selectedGenres.length > 0) query = query.overlaps('genre_ids', selectedGenres)
      const { data } = await query.order('name')
      const result = data || []
      setBands(result)
      if (result.length > 0) {
        const ids = result.map((b: any) => b.id)
        const { data: follows } = await supabase.from('follows').select('band_id').in('band_id', ids)
        const counts: Record<string, number> = {}
        follows?.forEach((f: any) => { counts[f.band_id] = (counts[f.band_id] || 0) + 1 })
        setFollowerCounts(counts)
      }
    } else {
      let query = supabase.from('bands').select('*').eq('is_published', true)
      if (selectedGenres.length > 0) query = query.overlaps('genre_ids', selectedGenres)
      const { data } = await query.order('name')
      const result = data || []
      setBands(result)

      // Fetch follower counts for these bands
      if (result.length > 0) {
        const bandIds = result.map((b: any) => b.id)
        const { data: follows } = await supabase
          .from('follows')
          .select('band_id')
          .in('band_id', bandIds)
        const counts: Record<string, number> = {}
        follows?.forEach((f: any) => {
          counts[f.band_id] = (counts[f.band_id] || 0) + 1
        })
        setFollowerCounts(counts)
      }
    }
    setLoading(false)
  }

  const toggleInfluence = (id: number) => {
    setSelectedInfluences(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleGenre = (id: number) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filteredInfluences = influences.filter(i =>
    i.name.toLowerCase().includes(influenceSearch.toLowerCase())
  )

  const getBandGenres = (genreIds: number[] | null) => {
    if (!genreIds || genreIds.length === 0) return []
    return allGenres.filter(g => genreIds.includes(g.id))
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/" backLabel="Home" />

      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-10">
        {/* Sidebar filters */}
        <aside className="w-72 shrink-0">
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
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {filteredInfluences.filter(i => !selectedInfluences.includes(i.id)).map(i => (
              <button key={i.id} onClick={() => toggleInfluence(i.id)}
                className="text-left px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors">
                {i.name}
              </button>
            ))}
          </div>

          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 mt-8">Filter by Genre</h2>
          <div className="flex flex-wrap gap-1.5">
            {allGenres.map(g => (
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
            <button onClick={() => { setSelectedInfluences([]); setSelectedGenres([]) }}
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
            <span className="text-zinc-600 text-sm">{bands.length} band{bands.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <p className="text-zinc-600 animate-pulse">Loading bands...</p>
          ) : bands.length === 0 ? (
            <div className="border border-zinc-800 rounded p-16 text-center text-zinc-600">
              <p className="text-4xl mb-4">🔍</p>
              <p className="uppercase tracking-widest text-sm">No bands found</p>
              <p className="text-xs mt-2">Try different filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bands.map(band => (
                <Link key={band.id} href={`/bands/${band.slug}`}
                  className="border border-zinc-800 rounded p-6 hover:border-zinc-600 transition-colors flex items-center gap-6 group">
                  <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {band.logo_url
                      ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">🤘</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black uppercase tracking-wide group-hover:text-red-500 transition-colors">
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
                        <span key={g.id} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-500">
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
    </main>
  )
}

export default function Explore() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ExploreContent />
    </Suspense>
  )
}
