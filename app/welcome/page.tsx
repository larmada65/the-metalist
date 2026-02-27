'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type PrimaryProfile = 'musician' | 'producer' | 'engineer' | 'fan' | null

const FEATURES_BY_PROFILE: Record<NonNullable<PrimaryProfile>, { label: string; href: string; desc: string }[]> = {
  musician: [
    { label: 'Create a Band', href: '/dashboard/create-band', desc: 'Start your band profile' },
    { label: 'Explore Bands', href: '/explore', desc: 'Browse & discover metal bands' },
    { label: 'Find Producers & Engineers', href: '/prod-engineers', desc: 'Connect for recording & mixing' },
  ],
  producer: [
    { label: 'Explore Bands', href: '/explore', desc: 'Browse & discover metal bands' },
    { label: 'Explore Demos', href: '/demos', desc: 'Find demos from musicians looking for producers' },
    { label: 'Find Musicians', href: '/members', desc: 'Browse the member directory' },
  ],
  engineer: [
    { label: 'Explore Bands', href: '/explore', desc: 'Browse & discover metal bands' },
    { label: 'Explore Demos', href: '/demos', desc: 'Find demos from musicians looking for engineers' },
    { label: 'Find Musicians', href: '/members', desc: 'Browse the member directory' },
  ],
  fan: [
    { label: 'Explore Bands', href: '/explore', desc: 'Browse & discover metal bands' },
    { label: 'Discover Releases', href: '/releases', desc: 'Albums, EPs & singles' },
    { label: 'Follow Bands', href: '/explore', desc: 'Stay updated on your favourites' },
  ],
}

export default function WelcomePage() {
  const [loading, setLoading] = useState(true)
  const [primaryProfile, setPrimaryProfile] = useState<PrimaryProfile>(null)
  const [username, setUsername] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Retry pending profile (e.g. if initial upsert failed during registration)
      const pendingProfile = typeof localStorage !== 'undefined' ? localStorage.getItem('pending_profile') : null
      if (pendingProfile) {
        try {
          const data = JSON.parse(pendingProfile)
          await supabase.from('profiles').upsert(data, { onConflict: 'id' })
          localStorage.removeItem('pending_profile')
        } catch (_) {}
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, primary_profile, is_producer, is_sound_engineer, is_musician, is_fan')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUsername(profile.username)
        // Use primary_profile if set; otherwise derive from the single selected role
        let primary: PrimaryProfile = profile.primary_profile as PrimaryProfile
        if (!primary) {
          if (profile.is_musician) primary = 'musician'
          else if (profile.is_producer) primary = 'producer'
          else if (profile.is_sound_engineer) primary = 'engineer'
          else if (profile.is_fan) primary = 'fan'
        }
        setPrimaryProfile(primary)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-600 animate-pulse">Loading...</p>
      </main>
    )
  }

  const features = primaryProfile ? FEATURES_BY_PROFILE[primaryProfile] : FEATURES_BY_PROFILE.fan
  const profileLabel = primaryProfile === 'musician' ? 'Musician' : primaryProfile === 'producer' ? 'Producer' : primaryProfile === 'engineer' ? 'Sound Engineer' : 'Fan'

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav username={username ?? undefined} />

      <div className="max-w-lg mx-auto px-6 py-20 flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-display uppercase tracking-tight text-center leading-tight mb-4">
          Welcome to The Metalist!
        </h1>
        <p className="text-zinc-400 text-center text-lg mb-12">
          A community built by metalheads, for metalheads.
        </p>

        <div className="w-full border border-zinc-800 rounded-xl p-6 bg-zinc-950/70 mb-10">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Getting started as a {profileLabel}</p>
          <p className="text-sm text-zinc-400 mb-5">
            Here are a few things you can do right away:
          </p>
          <div className="flex flex-col gap-3">
            {features.map((f) => (
              <Link
                key={f.href + f.label}
                href={f.href}
                className="block border border-zinc-800 hover:border-red-600 rounded-lg p-4 transition-colors group"
              >
                <p className="font-bold uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">
                  {f.label}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/dashboard"
          className="w-full max-w-xs text-center py-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest transition-colors"
        >
          Go to Dashboard
        </Link>

        <p className="text-xs text-zinc-600 mt-6 text-center">
          You can add more roles (Producer, Musician, Fan, etc.) anytime in{' '}
          <Link href="/dashboard/profile" className="text-red-500 hover:text-red-400 underline underline-offset-2">
            profile settings
          </Link>.
        </p>
      </div>
    </main>
  )
}
