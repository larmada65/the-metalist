'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Member = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  bio: string | null
  is_producer: boolean
  is_sound_engineer: boolean
  genre_ids: number[] | null
  band_count: number
}

type Genre = { id: number; name: string }

function avatarBg(str: string): string {
  const palette = ['#7f1d1d', '#78350f', '#14532d', '#1e3a5f', '#4c1d95', '#831843', '#134e4a', '#3b0764']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: profileData }, { data: genreData }, { data: membershipData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, first_name, last_name, bio, is_producer, is_sound_engineer, genre_ids')
          .order('username'),
        supabase.from('genres_list').select('id, name').order('name'),
        supabase
          .from('band_members')
          .select('profile_id')
          .eq('status', 'approved'),
      ])

      if (profileData) {
        const bandCounts: Record<string, number> = {}
        membershipData?.forEach((m: any) => {
          if (m.profile_id) bandCounts[m.profile_id] = (bandCounts[m.profile_id] || 0) + 1
        })
        const withCounts = profileData.map((p: any) => ({
          ...p,
          band_count: bandCounts[p.id] || 0,
        }))
        setMembers(withCounts)
      }

      if (genreData) setAllGenres(genreData)
      setLoading(false)
    }
    load()
  }, [])

  const activeGenres = allGenres.filter(g =>
    members.some(m => m.genre_ids?.includes(g.id))
  )

  const filtered = members
    .filter(m => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ').toLowerCase()
      return name.includes(q) || m.username.toLowerCase().includes(q)
    })
    .filter(m => !selectedGenre || (m.genre_ids?.includes(selectedGenre) ?? false))

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
      active
        ? 'bg-red-600 border-red-600 text-white'
        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
    }`

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Explore" />

      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-black uppercase tracking-tight mb-2">Members</h1>
          <p className="text-zinc-600 text-sm">
            Everyone in the metal underground community.
          </p>
        </div>

        {/* Stats */}
        {!loading && members.length > 0 && (
          <div className="flex gap-10 mb-10 border-b border-zinc-800 pb-8">
            <div>
              <p className="text-3xl font-black">{members.length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Members</p>
            </div>
            <div>
              <p className="text-3xl font-black">{members.filter(m => m.band_count > 0).length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">In a band</p>
            </div>
            <div>
              <p className="text-3xl font-black">{members.filter(m => m.is_producer || m.is_sound_engineer).length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Producers / Engineers</p>
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
              placeholder="Search by name or username..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-zinc-600 w-64"
            />
          </div>
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
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">🤘</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              {members.length === 0 ? 'No members yet.' : 'No results for these filters.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')}
                className="mt-4 text-xs text-red-500 hover:text-red-400 transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(member => {
              const displayName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username
              const initial = displayName[0]?.toUpperCase() || '?'
              return (
                <Link key={member.id} href={`/members/${member.username}`}
                  className="border border-zinc-800 rounded-xl p-4 flex items-center gap-3 hover:border-zinc-600 transition-colors group">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-black select-none"
                    style={{ backgroundColor: avatarBg(member.username) }}>
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors truncate">
                      {displayName}
                    </p>
                    <p className="text-zinc-600 text-xs truncate">@{member.username}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {member.band_count > 0 && (
                        <span className="text-xs text-zinc-700">
                          {member.band_count} band{member.band_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {member.is_producer && (
                        <span className="text-xs text-red-500/70">· Producer</span>
                      )}
                      {member.is_sound_engineer && (
                        <span className="text-xs text-zinc-500/70">· Engineer</span>
                      )}
                    </div>
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
