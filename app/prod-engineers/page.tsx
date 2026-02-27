'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Profile = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  bio: string | null
  avatar_url: string | null
  is_producer: boolean
  is_sound_engineer: boolean
  production_level: string | null
}

function avatarBg(str: string): string {
  const palette = ['#7f1d1d','#78350f','#14532d','#1e3a5f','#4c1d95','#831843','#134e4a','#3b0764']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

export default function ProdEngineersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isMusician, setIsMusician] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_musician')
        .eq('id', user.id)
        .single()

      const canAccess = profile?.is_musician
      setIsMusician(!!canAccess)

      if (!canAccess) {
        setLoading(false)
        return
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, bio, avatar_url, is_producer, is_sound_engineer, production_level')
        .or('is_producer.eq.true,is_sound_engineer.eq.true')
        .order('username')

      setProfiles((profilesData || []).filter((p: Profile) => p.id !== user.id))
      setLoading(false)
    }
    load()
  }, [])

  if (!loading && !isMusician) {
    return (
      <main className="min-h-screen bg-black text-white">
        <GlobalNav backHref="/explore" backLabel="Bands" />
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-5xl mb-6">🎚</p>
            <h1 className="text-xl font-black uppercase tracking-tight text-zinc-300 mb-3">
              Prod / Engineers
            </h1>
            <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
              The Prod/Engineers tab is for musicians looking for producers and sound engineers.
            </p>
            <Link
              href="/dashboard/profile"
              className="inline-block px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white transition-colors"
            >
              Update your profile
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Bands" />

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-5xl font-display uppercase tracking-tight mb-2">Prod / Engineers</h1>
          <p className="text-zinc-600 text-sm">
            Find producers and sound engineers for your next recording or mix.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">🎚</p>
            <p className="text-zinc-400 font-black uppercase tracking-wide mb-2">No producers or engineers yet</p>
            <p className="text-zinc-600 text-sm">
              When members mark themselves as producers or sound engineers, they will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {profiles.map(p => {
              const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
              const roles: string[] = []
              if (p.is_producer) roles.push('Producer')
              if (p.is_sound_engineer) roles.push('Sound Engineer')
              return (
                <div key={p.id} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
                  <Link href={`/members/${p.username}`}>
                    <div
                      className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-base font-black"
                      style={p.avatar_url ? {} : { backgroundColor: avatarBg(p.username) }}
                    >
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        : displayName[0]?.toUpperCase()
                      }
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/members/${p.username}`} className="font-black uppercase tracking-wide text-sm hover:text-red-500 transition-colors block truncate">
                      {displayName}
                    </Link>
                    <p className="text-xs text-zinc-500">@{p.username}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {roles.map(r => (
                        <span key={r} className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 uppercase tracking-widest">
                          {r}
                        </span>
                      ))}
                      {p.production_level && (
                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                          · {p.production_level}
                        </span>
                      )}
                    </div>
                    {p.bio && <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{p.bio}</p>}
                  </div>
                  <Link
                    href={`/messages/${p.username}`}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white transition-colors shrink-0"
                  >
                    Message
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
