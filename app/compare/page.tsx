'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Band = {
  id: string
  name: string
  slug: string
  country: string | null
  year_formed: number | null
  logo_url: string | null
  genre_ids: number[] | null
}

type BandDetail = Band & {
  releaseCount: number
  memberCount: number
  followerCount: number
  avgRating: number | null
  ratingCount: number
  showCount: number
  genres: string[]
}

type Genre = { id: number; name: string }

function StatRow({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-zinc-800 last:border-0">
      <div className="text-right pr-4">{a}</div>
      <div className="text-center text-xs text-zinc-600 uppercase tracking-widest px-2">{label}</div>
      <div className="text-left pl-4">{b}</div>
    </div>
  )
}

function ratingColor(r: number) {
  if (r >= 15) return 'text-green-400'
  if (r >= 10) return 'text-yellow-400'
  return 'text-red-400'
}

export default function ComparePage() {
  const [allBands, setAllBands] = useState<Band[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [bandA, setBandA] = useState<BandDetail | null>(null)
  const [bandB, setBandB] = useState<BandDetail | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('bands').select('id, name, slug, country, year_formed, logo_url, genre_ids').eq('is_published', true).order('name'),
      supabase.from('genres_list').select('id, name'),
    ]).then(([{ data: bands }, { data: genres }]) => {
      if (bands) setAllBands(bands)
      if (genres) setAllGenres(genres)
    })
  }, [])

  const loadBandDetail = async (band: Band): Promise<BandDetail> => {
    const [
      { data: releases },
      { data: members },
      { count: followers },
      { data: ratings },
      { count: shows },
    ] = await Promise.all([
      supabase.from('releases').select('id').eq('band_id', band.id),
      supabase.from('band_members').select('id').eq('band_id', band.id).eq('status', 'approved').neq('role', 'leader'),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('band_id', band.id),
      supabase.from('ratings').select('score, releases!inner(band_id)').eq('releases.band_id', band.id),
      supabase.from('shows').select('*', { count: 'exact', head: true }).eq('band_id', band.id),
    ])
    const scores = (ratings || []).map((r: any) => r.score)
    const avgRating = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
    const genres = allGenres.filter(g => band.genre_ids?.includes(g.id)).map(g => g.name)
    return {
      ...band,
      releaseCount: releases?.length || 0,
      memberCount: members?.length || 0,
      followerCount: followers || 0,
      avgRating,
      ratingCount: scores.length,
      showCount: shows || 0,
      genres,
    }
  }

  const selectBand = async (band: Band, side: 'A' | 'B') => {
    if (side === 'A') {
      setLoadingA(true)
      setSearchA(band.name)
      const detail = await loadBandDetail(band)
      setBandA(detail)
      setLoadingA(false)
    } else {
      setLoadingB(true)
      setSearchB(band.name)
      const detail = await loadBandDetail(band)
      setBandB(detail)
      setLoadingB(false)
    }
  }

  const filteredA = searchA.length >= 1
    ? allBands.filter(b => b.name.toLowerCase().includes(searchA.toLowerCase()) && b.id !== bandB?.id).slice(0, 6)
    : []
  const filteredB = searchB.length >= 1
    ? allBands.filter(b => b.name.toLowerCase().includes(searchB.toLowerCase()) && b.id !== bandA?.id).slice(0, 6)
    : []

  const showDropdownA = filteredA.length > 0 && !bandA
  const showDropdownB = filteredB.length > 0 && !bandB

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/rankings" backLabel="Rankings" />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-display uppercase tracking-tight mb-2">Compare</h1>
        <p className="text-zinc-600 text-sm mb-12">Pick two bands and compare them side by side.</p>

        {/* Band pickers */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          {(['A', 'B'] as const).map(side => {
            const selected = side === 'A' ? bandA : bandB
            const search = side === 'A' ? searchA : searchB
            const setSearch = side === 'A' ? setSearchA : setSearchB
            const filtered = side === 'A' ? filteredA : filteredB
            const showDropdown = side === 'A' ? showDropdownA : showDropdownB
            const loading = side === 'A' ? loadingA : loadingB
            const clear = () => {
              if (side === 'A') { setBandA(null); setSearchA('') }
              else { setBandB(null); setSearchB('') }
            }

            return (
              <div key={side} className="relative">
                <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Band {side}</p>
                {selected ? (
                  <div className="border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {selected.logo_url
                        ? <img src={selected.logo_url} alt={selected.name} className="w-full h-full object-cover" />
                        : <span className="text-base">🤘</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase tracking-wide text-sm truncate">{selected.name}</p>
                      {selected.country && <p className="text-xs text-zinc-600">{selected.country}</p>}
                    </div>
                    <button onClick={clear} className="text-xs text-zinc-600 hover:text-red-400 transition-colors shrink-0">✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search band..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                    />
                    {loading && <p className="text-xs text-zinc-600 mt-2 animate-pulse">Loading...</p>}
                    {showDropdown && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden z-10 shadow-2xl">
                        {filtered.map(b => (
                          <button key={b.id} onClick={() => selectBand(b, side)}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-900 transition-colors border-b border-zinc-800 last:border-0">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                              {b.logo_url
                                ? <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
                                : <span className="text-sm">🤘</span>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{b.name}</p>
                              {b.country && <p className="text-xs text-zinc-600">{b.country}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Comparison table */}
        {bandA && bandB && (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-zinc-900/50">
              <div className="p-5 text-center border-r border-zinc-800">
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mx-auto mb-2 flex items-center justify-center">
                  {bandA.logo_url
                    ? <img src={bandA.logo_url} alt={bandA.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl">🤘</span>}
                </div>
                <Link href={`/bands/${bandA.slug}`} className="font-black uppercase tracking-wide text-sm hover:text-red-400 transition-colors">
                  {bandA.name}
                </Link>
                {bandA.country && <p className="text-xs text-zinc-600 mt-0.5">{bandA.country}</p>}
              </div>
              <div className="p-5 flex items-center justify-center">
                <span className="text-xs text-zinc-700 uppercase tracking-widest">vs</span>
              </div>
              <div className="p-5 text-center border-l border-zinc-800">
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mx-auto mb-2 flex items-center justify-center">
                  {bandB.logo_url
                    ? <img src={bandB.logo_url} alt={bandB.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl">🤘</span>}
                </div>
                <Link href={`/bands/${bandB.slug}`} className="font-black uppercase tracking-wide text-sm hover:text-red-400 transition-colors">
                  {bandB.name}
                </Link>
                {bandB.country && <p className="text-xs text-zinc-600 mt-0.5">{bandB.country}</p>}
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-4">
              <StatRow label="Formed"
                a={<span className={`text-sm font-bold ${bandA.year_formed && bandB.year_formed && bandA.year_formed < bandB.year_formed ? 'text-green-400' : 'text-white'}`}>{bandA.year_formed || '—'}</span>}
                b={<span className={`text-sm font-bold ${bandA.year_formed && bandB.year_formed && bandB.year_formed < bandA.year_formed ? 'text-green-400' : 'text-white'}`}>{bandB.year_formed || '—'}</span>}
              />
              <StatRow label="Followers"
                a={<span className={`text-sm font-bold ${bandA.followerCount > bandB.followerCount ? 'text-green-400' : 'text-white'}`}>{bandA.followerCount}</span>}
                b={<span className={`text-sm font-bold ${bandB.followerCount > bandA.followerCount ? 'text-green-400' : 'text-white'}`}>{bandB.followerCount}</span>}
              />
              <StatRow label="Releases"
                a={<span className={`text-sm font-bold ${bandA.releaseCount > bandB.releaseCount ? 'text-green-400' : 'text-white'}`}>{bandA.releaseCount}</span>}
                b={<span className={`text-sm font-bold ${bandB.releaseCount > bandA.releaseCount ? 'text-green-400' : 'text-white'}`}>{bandB.releaseCount}</span>}
              />
              <StatRow label="Members"
                a={<span className="text-sm font-bold text-white">{bandA.memberCount}</span>}
                b={<span className="text-sm font-bold text-white">{bandB.memberCount}</span>}
              />
              <StatRow label="Avg Rating"
                a={bandA.avgRating !== null
                  ? <span className={`text-sm font-bold ${bandA.avgRating > (bandB.avgRating ?? -1) ? ratingColor(bandA.avgRating) : 'text-white'}`}>{bandA.avgRating.toFixed(1)}/20 <span className="text-xs text-zinc-600">({bandA.ratingCount})</span></span>
                  : <span className="text-zinc-700 text-sm">—</span>}
                b={bandB.avgRating !== null
                  ? <span className={`text-sm font-bold ${bandB.avgRating > (bandA.avgRating ?? -1) ? ratingColor(bandB.avgRating) : 'text-white'}`}>{bandB.avgRating.toFixed(1)}/20 <span className="text-xs text-zinc-600">({bandB.ratingCount})</span></span>
                  : <span className="text-zinc-700 text-sm">—</span>}
              />
              <StatRow label="Shows"
                a={<span className={`text-sm font-bold ${bandA.showCount > bandB.showCount ? 'text-green-400' : 'text-white'}`}>{bandA.showCount}</span>}
                b={<span className={`text-sm font-bold ${bandB.showCount > bandA.showCount ? 'text-green-400' : 'text-white'}`}>{bandB.showCount}</span>}
              />
              <StatRow label="Genres"
                a={<div className="flex flex-wrap gap-1 justify-end">{bandA.genres.slice(0, 3).map(g => <span key={g} className="text-xs px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">{g}</span>)}</div>}
                b={<div className="flex flex-wrap gap-1">{bandB.genres.slice(0, 3).map(g => <span key={g} className="text-xs px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">{g}</span>)}</div>}
              />
            </div>

            {/* Shared genres callout */}
            {(() => {
              const shared = bandA.genres.filter(g => bandB.genres.includes(g))
              if (shared.length === 0) return null
              return (
                <div className="border-t border-zinc-800 px-6 py-3 bg-zinc-900/30">
                  <p className="text-xs text-zinc-500 text-center">
                    Shared genres: <span className="text-zinc-300">{shared.join(', ')}</span>
                  </p>
                </div>
              )
            })()}
          </div>
        )}

        {(!bandA || !bandB) && (
          <div className="border border-zinc-800 rounded-xl p-16 text-center text-zinc-700">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="uppercase tracking-widest text-sm">Select two bands to compare</p>
          </div>
        )}
      </div>
    </main>
  )
}
