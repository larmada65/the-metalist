'use client'
import { useState } from 'react'
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
  avatar_url: string | null
  musician_instruments: string[] | null
  musician_level: string | null
  musician_link: string | null
  production_level: string | null
  studio_gear: string | null
  band_count: number
}

type Genre = { id: number; name: string }
type Role = 'all' | 'musician' | 'producer' | 'engineer'

function avatarBg(str: string): string {
  const palette = ['#7f1d1d', '#78350f', '#14532d', '#1e3a5f', '#4c1d95', '#831843', '#134e4a', '#3b0764']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

const isMusician = (m: Member) => m.musician_instruments && m.musician_instruments.length > 0

type Props = {
  members: Member[]
  genres: Genre[]
}

export default function MembersClient({ members, genres }: Props) {
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('all')
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)

  const rolePool = (role: Role) => members.filter(m => {
    if (role === 'musician') return isMusician(m)
    if (role === 'producer') return m.is_producer
    if (role === 'engineer') return m.is_sound_engineer
    return true
  })

  const activeGenres = genres.filter(g =>
    rolePool(selectedRole).some(m => m.genre_ids?.includes(g.id))
  )

  const filtered = rolePool(selectedRole)
    .filter(m => !selectedGenre || (m.genre_ids?.includes(selectedGenre) ?? false))
    .filter(m => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ').toLowerCase()
      return name.includes(q) || m.username.toLowerCase().includes(q)
    })

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
          <h1 className="text-5xl font-display uppercase tracking-tight mb-2">Members</h1>
          <p className="text-zinc-600 text-sm">
            Every metalhead on The Metalist — musicians, producers, engineers, and fans.
          </p>
        </div>

        {/* Stats */}
        {members.length > 0 && (
          <div className="flex flex-wrap gap-6 md:gap-10 mb-10 border-b border-zinc-800 pb-8">
            <div>
              <p className="text-3xl font-black tabular">{members.length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Members</p>
            </div>
            <div>
              <p className="text-3xl font-black tabular">{members.filter(isMusician).length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Musicians</p>
            </div>
            <div>
              <p className="text-3xl font-black tabular">{members.filter(m => m.is_producer).length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Producers</p>
            </div>
            <div>
              <p className="text-3xl font-black tabular">{members.filter(m => m.is_sound_engineer).length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Engineers</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-zinc-600 w-full sm:w-60"
            />
            <button onClick={() => setSelectedRole('all')} className={pillClass(selectedRole === 'all')}>All</button>
            <button onClick={() => setSelectedRole('musician')} className={pillClass(selectedRole === 'musician')}>Musicians</button>
            <button onClick={() => setSelectedRole('producer')} className={pillClass(selectedRole === 'producer')}>Producers</button>
            <button onClick={() => setSelectedRole('engineer')} className={pillClass(selectedRole === 'engineer')}>Engineers</button>
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
        {filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">🤘</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              {members.length === 0 ? 'The pit is empty.' : 'No members match these filters. Widen the search.'}
            </p>
            {(search || selectedRole !== 'all' || selectedGenre) && (
              <button onClick={() => { setSearch(''); setSelectedRole('all'); setSelectedGenre(null) }}
                className="mt-4 text-xs text-red-500 hover:text-red-400 transition-colors">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(member => {
              const displayName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username
              const initial = displayName[0]?.toUpperCase() || '?'
              const musician = isMusician(member)

              return (
                <Link key={member.id} href={`/members/${member.username}`}
                  className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/60 transition-all group flex flex-col gap-3 bg-zinc-950">

                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-lg font-black select-none"
                      style={member.avatar_url ? {} : { backgroundColor: avatarBg(member.username) }}>
                      {member.avatar_url
                        ? <img src={member.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        : initial
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors truncate">
                        {displayName}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">@{member.username}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {member.username === 'larmada' && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-amber-600/60 bg-amber-950/40 text-amber-400 uppercase tracking-widest font-bold">
                            Founder
                          </span>
                        )}
                        {musician && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 uppercase tracking-widest font-medium">
                            Musician
                          </span>
                        )}
                        {member.is_producer && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-red-900/50 bg-red-950/30 text-red-400 uppercase tracking-widest font-medium">
                            Producer
                          </span>
                        )}
                        {member.is_sound_engineer && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 uppercase tracking-widest font-medium">
                            Engineer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {musician && member.musician_instruments && (
                    <div className="flex flex-wrap gap-1">
                      {member.musician_instruments.map(inst => (
                        <span key={inst} className="text-xs px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                          {inst}
                        </span>
                      ))}
                      {member.musician_level && (
                        <span className="text-xs text-zinc-700 self-center ml-1">{member.musician_level}</span>
                      )}
                    </div>
                  )}

                  {(member.is_producer || member.is_sound_engineer) && member.production_level && (
                    <p className="text-xs text-zinc-600">{member.production_level}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800/60">
                    <div className="flex gap-3 text-xs text-zinc-700">
                      {member.band_count > 0 && (
                        <span>{member.band_count} band{member.band_count !== 1 ? 's' : ''}</span>
                      )}
                      {musician && member.musician_link && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Demo
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-700 group-hover:text-red-500 transition-colors text-xs">View →</span>
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
