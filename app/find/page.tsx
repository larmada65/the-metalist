'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type FindProfile = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  bio: string | null
  instagram_url: string | null
  twitter_url: string | null
  website_url: string | null
  is_producer: boolean
  is_sound_engineer: boolean
  genre_ids: number[] | null
}

type Genre = { id: number; name: string }

function avatarBg(str: string): string {
  const palette = ['#7f1d1d', '#78350f', '#14532d', '#1e3a5f', '#4c1d95', '#831843', '#134e4a', '#3b0764']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

type Role = 'all' | 'producer' | 'engineer'

export default function FindMusicians() {
  const [profiles, setProfiles] = useState<FindProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role>('all')
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data }, { data: genreData }] = await Promise.all([
        supabase.from('profiles')
          .select('id, username, first_name, last_name, bio, instagram_url, twitter_url, website_url, is_producer, is_sound_engineer, genre_ids')
          .or('is_producer.eq.true,is_sound_engineer.eq.true')
          .order('username'),
        supabase.from('genres_list').select('id, name').order('name'),
      ])
      if (data) setProfiles(data as FindProfile[])
      if (genreData) setAllGenres(genreData)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = profiles
    .filter(p => {
      if (selectedRole === 'producer') return p.is_producer
      if (selectedRole === 'engineer') return p.is_sound_engineer
      return true
    })
    .filter(p => {
      if (!selectedGenre) return true
      return p.genre_ids?.includes(selectedGenre) ?? false
    })
    .filter(p => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ').toLowerCase()
      return name.includes(q) || p.username.toLowerCase().includes(q)
    })

  // Only show genres that appear among visible profiles (after role filter)
  const activeGenres = allGenres.filter(g =>
    profiles
      .filter(p => selectedRole === 'producer' ? p.is_producer : selectedRole === 'engineer' ? p.is_sound_engineer : true)
      .some(p => p.genre_ids?.includes(g.id))
  )

  const producerCount = profiles.filter(p => p.is_producer).length
  const engineerCount = profiles.filter(p => p.is_sound_engineer).length

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
          <h1 className="text-5xl font-black uppercase tracking-tight mb-2">
            Find Musicians
          </h1>
          <p className="text-zinc-600 text-sm text-justify max-w-xl">
            Producers and sound engineers from the metalhead community, available for collaboration.
            Click a profile to get in touch.
          </p>
        </div>

        {/* Stats */}
        {!loading && profiles.length > 0 && (
          <div className="flex gap-10 mb-12 border-b border-zinc-800 pb-10">
            <div>
              <p className="text-3xl font-black">{producerCount}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Producers</p>
            </div>
            <div>
              <p className="text-3xl font-black">{engineerCount}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Sound Engineers</p>
            </div>
            <div>
              <p className="text-3xl font-black">{profiles.length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Listed</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-zinc-600 w-56"
            />
            <button onClick={() => setSelectedRole('all')} className={pillClass(selectedRole === 'all')}>
              All
            </button>
            <button onClick={() => setSelectedRole('producer')} className={pillClass(selectedRole === 'producer')}>
              🎚 Producers
            </button>
            <button onClick={() => setSelectedRole('engineer')} className={pillClass(selectedRole === 'engineer')}>
              🎛 Sound Engineers
            </button>
          </div>
          {activeGenres.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-zinc-600 uppercase tracking-widest shrink-0">Genre:</span>
              <button onClick={() => setSelectedGenre(null)}
                className={pillClass(selectedGenre === null)}>
                All
              </button>
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
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-zinc-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-zinc-800 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">🎛</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm mb-2">
              {profiles.length === 0
                ? 'No musicians listed yet.'
                : 'No results for these filters.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-3 text-xs text-red-500 hover:text-red-400 transition-colors">
                Clear search
              </button>
            )}
            {profiles.length === 0 && (
              <p className="text-zinc-700 text-xs mt-4 max-w-sm mx-auto">
                Musicians can list themselves by enabling the Producer or Sound Engineer tag
                in their <Link href="/dashboard/profile" className="text-red-500 hover:text-red-400">profile settings</Link>.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(profile => {
              const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
              const initial = displayName[0]?.toUpperCase() || '?'

              return (
                <Link key={profile.id} href={`/members/${profile.username}`}
                  className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-all group flex flex-col gap-4">

                  {/* Avatar + name + tags */}
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-xl font-black select-none"
                      style={{ backgroundColor: avatarBg(profile.username) }}>
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors truncate">
                        {displayName}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">@{profile.username}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {profile.is_producer && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-red-900/50 bg-red-950/30 text-red-400 uppercase tracking-widest font-medium">
                            Producer
                          </span>
                        )}
                        {profile.is_sound_engineer && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 uppercase tracking-widest font-medium">
                            Engineer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio ? (
                    <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 flex-1">
                      {profile.bio}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 mt-auto">
                    <div className="flex gap-3">
                      {profile.instagram_url && (
                        <span className="text-xs text-zinc-700 uppercase tracking-widest font-medium">IG</span>
                      )}
                      {profile.twitter_url && (
                        <span className="text-xs text-zinc-700 uppercase tracking-widest font-medium">TW</span>
                      )}
                      {profile.website_url && (
                        <span className="text-xs text-zinc-700 uppercase tracking-widest font-medium">Web</span>
                      )}
                      {!profile.instagram_url && !profile.twitter_url && !profile.website_url && (
                        <span className="text-xs text-zinc-800 uppercase tracking-widest">—</span>
                      )}
                    </div>
                    <span className="text-zinc-700 group-hover:text-red-500 transition-colors text-xs">
                      View profile →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
