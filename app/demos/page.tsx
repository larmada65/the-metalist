'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'
import { useAudioPlayer } from '../../components/AudioPlayerProvider'

type DemoWithProfile = {
  id: string
  title: string | null
  audio_path: string
  visibility: string
  key: string | null
  tempo: number | null
  created_at: string
  profiles: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

export default function DemosPage() {
  const [demos, setDemos] = useState<DemoWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isProducerOrEngineer, setIsProducerOrEngineer] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { setTrackAndPlay } = useAudioPlayer()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_producer, is_sound_engineer')
        .eq('id', user.id)
        .single()

      const canAccess = profile && (profile.is_producer || profile.is_sound_engineer)
      setIsProducerOrEngineer(!!canAccess)

      if (!canAccess) {
        setLoading(false)
        return
      }

      const { data: demosData, error: demosError } = await supabase
        .from('demos')
        .select('id, title, audio_path, visibility, key, tempo, created_at, profile_id')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })

      if (demosError) {
        setLoading(false)
        return
      }

      const demosList = demosData || []
      if (demosList.length === 0) {
        setDemos([])
        setLoading(false)
        return
      }

      const profileIds = [...new Set(demosList.map((d: { profile_id: string }) => d.profile_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .in('id', profileIds)

      const profileMap: Record<string, DemoWithProfile['profiles']> = {}
      ;(profilesData || []).forEach((p: DemoWithProfile['profiles'] & { id: string }) => {
        profileMap[p.id] = { id: p.id, username: p.username, first_name: p.first_name, last_name: p.last_name, avatar_url: p.avatar_url }
      })

      const combined: DemoWithProfile[] = demosList
        .filter((d: { profile_id: string }) => profileMap[d.profile_id])
        .map((d: { id: string; title: string | null; audio_path: string; visibility: string; key: string | null; tempo: number | null; created_at: string; profile_id: string }) => ({
          ...d,
          profiles: profileMap[d.profile_id],
        }))

      setDemos(combined)
      setLoading(false)
    }
    load()
  }, [])

  if (!loading && !isProducerOrEngineer) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6">
        <GlobalNav />
        <p className="text-zinc-500 text-center">The Demos tab is for producers and sound engineers.</p>
        <Link href="/dashboard/profile" className="text-red-500 hover:text-red-400 text-sm">Update your profile</Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav />

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-5xl font-display uppercase tracking-tight mb-2">Demos</h1>
          <p className="text-zinc-600 text-sm">
            Browse unfinished songs from musicians. Reach out if you want to collaborate on mixing or production.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : demos.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">🎵</p>
            <p className="text-zinc-400 font-black uppercase tracking-wide mb-2">No public demos yet</p>
            <p className="text-zinc-600 text-sm">
              When musicians share demos, they will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {demos.map(d => {
              const p = d.profiles as DemoWithProfile['profiles']
              const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
              const { data } = supabase.storage.from('band-logos').getPublicUrl(d.audio_path)
              const publicUrl = data?.publicUrl
              return (
                <div key={d.id} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => publicUrl && setTrackAndPlay({
                      id: d.id,
                      title: d.title || 'Demo',
                      bandName: displayName,
                      src: publicUrl,
                    })}
                    className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 hover:border-red-600 transition-colors"
                  >
                    <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{d.title || 'Untitled demo'}</p>
                    <Link href={`/members/${p.username}`} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                      {[d.key && `Key: ${d.key}`, d.tempo && `${d.tempo} BPM`, displayName, `@${p.username}`].filter(Boolean).join(' · ')}
                    </Link>
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
