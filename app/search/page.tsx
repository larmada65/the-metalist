'use client'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '../../lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type BandResult = {
  id: string
  name: string
  slug: string
  country: string | null
  logo_url: string | null
  genre_ids: number[] | null
}

type ReleaseResult = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  bands: { name: string; slug: string }
}

type ProfileResult = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  is_producer: boolean
  is_sound_engineer: boolean
  musician_instruments: string[] | null
}

type Genre = { id: number; name: string }

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [input, setInput] = useState(query)
  const [bands, setBands] = useState<BandResult[]>([])
  const [releases, setReleases] = useState<ReleaseResult[]>([])
  const [profiles, setProfiles] = useState<ProfileResult[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const { data: genreData } = supabase.from('genres_list').select('id, name') as any
    supabase.from('genres_list').select('id, name').then(({ data }) => {
      if (data) setAllGenres(data)
    })
  }, [])

  useEffect(() => {
    if (query) runSearch(query)
  }, [query])

  const runSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    const term = q.trim().toLowerCase()

    // Search bands by name, country
    const { data: bandData } = await supabase
      .from('bands')
      .select('id, name, slug, country, logo_url, genre_ids')
      .eq('is_published', true)
      .or(`name.ilike.%${term}%,country.ilike.%${term}%`)
      .limit(10)

    // Search bands by influence name
    const { data: infMatches } = await supabase
      .from('influences_list')
      .select('id')
      .ilike('name', `%${term}%`)

    let infBands: BandResult[] = []
    if (infMatches && infMatches.length > 0) {
      const infIds = infMatches.map((i: any) => i.id)
      const { data: bids } = await supabase
        .from('band_influences')
        .select('band_id')
        .in('influence_id', infIds)
      if (bids && bids.length > 0) {
        const bandIds = [...new Set(bids.map((b: any) => b.band_id))]
        const { data: infBandData } = await supabase
          .from('bands')
          .select('id, name, slug, country, logo_url, genre_ids')
          .eq('is_published', true)
          .in('id', bandIds)
          .limit(10)
        if (infBandData) infBands = infBandData
      }
    }

    // Search bands by genre name
    const { data: genreMatches } = await supabase
      .from('genres_list')
      .select('id')
      .ilike('name', `%${term}%`)

    let genreBands: BandResult[] = []
    if (genreMatches && genreMatches.length > 0) {
      const genreIds = genreMatches.map((g: any) => g.id)
      const { data: genreBandData } = await supabase
        .from('bands')
        .select('id, name, slug, country, logo_url, genre_ids')
        .eq('is_published', true)
        .overlaps('genre_ids', genreIds)
        .limit(10)
      if (genreBandData) genreBands = genreBandData
    }

    // Merge and deduplicate bands
    const allBands = [...(bandData || []), ...infBands, ...genreBands]
    const seen = new Set<string>()
    const uniqueBands = allBands.filter(b => {
      if (seen.has(b.id)) return false
      seen.add(b.id)
      return true
    })
    setBands(uniqueBands)

    // Search releases
    const { data: releaseData } = await supabase
      .from('releases')
      .select('id, title, release_type, release_year, cover_url, bands(name, slug)')
      .ilike('title', `%${term}%`)
      .limit(10)
    setReleases((releaseData || []) as any)

    // Search user profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, is_producer, is_sound_engineer, musician_instruments')
      .or(`username.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
      .limit(8)
    setProfiles((profileData || []) as any)

    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) router.push(`/search?q=${encodeURIComponent(input.trim())}`)
  }

  const getBandGenres = (genreIds: number[] | null) => {
    if (!genreIds) return []
    return allGenres.filter(g => genreIds.includes(g.id)).slice(0, 3)
  }

  const totalResults = bands.length + releases.length + profiles.length

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Back to bands" />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-black uppercase tracking-tight mb-2">
          Search
        </h1>
        <p className="text-zinc-500 mb-10">Find bands, releases, and musicians.</p>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="flex gap-3 mb-12">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Band name, release, musician, genre, country..."
            autoFocus
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4 text-white text-lg focus:outline-none focus:border-red-500 transition-colors"
          />
          <button type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-xl transition-colors">
            Search
          </button>
        </form>

        {loading && (
          <p className="text-zinc-600 animate-pulse">Searching...</p>
        )}

        {!loading && searched && (
          <div className="flex flex-col gap-10">
            <p className="text-zinc-600 text-sm">
              {totalResults === 0 ? 'No results found.' : `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"`}
            </p>

            {/* Bands */}
            {bands.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
                  Bands ({bands.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {bands.map(band => (
                    <Link key={band.id} href={`/bands/${band.slug}`}
                      className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-600 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {band.logo_url
                          ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                          : <span className="text-xl">🤘</span>
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-black uppercase tracking-wide group-hover:text-red-500 transition-colors">
                          {band.name}
                        </p>
                        <div className="flex gap-3 text-xs text-zinc-600 mt-0.5">
                          {band.country && <span>{band.country}</span>}
                          {getBandGenres(band.genre_ids).map(g => (
                            <span key={g.id}>{g.name}</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-zinc-700 group-hover:text-red-500 transition-colors">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Releases */}
            {releases.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
                  Releases ({releases.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {releases.map(release => (
                    <Link key={release.id} href={`/releases/${release.id}`}
                      className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-600 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {release.cover_url
                          ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                          : <span className="text-xl">🎵</span>
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-black uppercase tracking-wide group-hover:text-red-500 transition-colors">
                          {release.title}
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {release.release_type}
                          {release.release_year ? ` · ${release.release_year}` : ''}
                          {release.bands?.name ? ` · ${release.bands.name}` : ''}
                        </p>
                      </div>
                      <span className="text-zinc-700 group-hover:text-red-500 transition-colors">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* People */}
            {profiles.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
                  People ({profiles.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {profiles.map(profile => {
                    const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
                    const roles = [
                      profile.musician_instruments?.length ? 'Musician' : null,
                      profile.is_producer ? 'Producer' : null,
                      profile.is_sound_engineer ? 'Engineer' : null,
                    ].filter(Boolean)
                    return (
                      <Link key={profile.id} href={`/members/${profile.username}`}
                        className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-600 transition-colors group">
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {profile.avatar_url
                            ? <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                            : <span className="text-xl font-black text-zinc-600">{displayName[0]?.toUpperCase()}</span>
                          }
                        </div>
                        <div className="flex-1">
                          <p className="font-black uppercase tracking-wide group-hover:text-red-500 transition-colors">
                            {displayName}
                          </p>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            @{profile.username}{roles.length > 0 ? ` · ${roles.join(', ')}` : ''}
                          </p>
                        </div>
                        <span className="text-zinc-700 group-hover:text-red-500 transition-colors">→</span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center text-zinc-700 py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="uppercase tracking-widest text-sm">Start typing to search...</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SearchContent />
    </Suspense>
  )
}
