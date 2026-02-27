'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'
import { useToast } from '../../components/Toast'

type BandMembership = {
  band_id: string
  role: 'leader' | 'member'
  status: 'pending' | 'approved' | 'rejected'
  bands: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    country: string | null
    year_formed: number | null
    is_published: boolean
  }
}

type Release = {
  id: string
  band_id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
}

type PendingRequest = {
  id: string
  name: string
  status: string
  profile_id: string
  bands: { id: string; name: string }
  profiles: { username: string }
}

type FollowingEntry = {
  following_id: string
  profiles: {
    username: string
    first_name: string | null
    last_name: string | null
  }
}

export default function Dashboard() {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<BandMembership[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [following, setFollowing] = useState<FollowingEntry[]>([])
  const [profileBasics, setProfileBasics] = useState<{
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    is_producer: boolean | null
    is_sound_engineer: boolean | null
    is_musician: boolean | null
    is_fan: boolean | null
    genre_ids: number[] | null
    primary_profile: string | null
  } | null>(null)
  const [bandsWithShows, setBandsWithShows] = useState<string[]>([])
  const [bandsWithInfluences, setBandsWithInfluences] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, avatar_url, is_producer, is_sound_engineer, is_musician, is_fan, genre_ids, primary_profile')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUsername(profile.username)
        setProfileBasics({
          first_name: profile.first_name ?? null,
          last_name: profile.last_name ?? null,
          avatar_url: profile.avatar_url ?? null,
          is_producer: profile.is_producer ?? null,
          is_sound_engineer: profile.is_sound_engineer ?? null,
          is_musician: profile.is_musician ?? null,
          is_fan: profile.is_fan ?? null,
          genre_ids: profile.genre_ids ?? null,
          primary_profile: profile.primary_profile ?? null,
        })
      }

      // Get all bands this user is part of
      const { data: membershipData } = await supabase
        .from('band_members')
        .select('band_id, role, status, bands(id, name, slug, logo_url, country, year_formed, is_published, description)')
        .eq('profile_id', user.id)
        .eq('status', 'approved')
      if (membershipData) setMemberships(membershipData as any)

      // Get releases + shows + influences for all bands
      if (membershipData && membershipData.length > 0) {
        const bandIds = membershipData.map((m: any) => m.band_id)
        const [
          { data: releaseData },
          { data: showData },
          { data: influenceData },
        ] = await Promise.all([
          supabase
            .from('releases')
            .select('id, band_id, title, release_type, release_year, cover_url, published')
            .in('band_id', bandIds)
            .order('release_year', { ascending: false }),
          supabase
            .from('shows')
            .select('band_id')
            .in('band_id', bandIds),
          supabase
            .from('band_influences')
            .select('band_id')
            .in('band_id', bandIds),
        ])
        if (releaseData) setReleases(releaseData as any)
        if (showData) {
          const ids = Array.from(new Set((showData as any[]).map(s => s.band_id as string)))
          setBandsWithShows(ids)
        }
        if (influenceData) {
          const ids = Array.from(new Set((influenceData as any[]).map(i => i.band_id as string)))
          setBandsWithInfluences(ids)
        }
      }

      // Get people this user follows
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id, profiles!user_follows_following_id_fkey(username, first_name, last_name)')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false })
      if (followingData) setFollowing(followingData as any)

      // Get invitations for this user to join bands
      const { data: pendingData } = await supabase
        .from('band_members')
        .select('id, name, status, band_id, bands(id, name)')
        .eq('profile_id', user.id)
        .eq('status', 'invited')
      if (pendingData) setPendingRequests(pendingData as any)

      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleApprove = async (requestId: string) => {
    const req = pendingRequests.find(r => r.id === requestId)
    setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    const { error } = await supabase.from('band_members').update({ status: 'approved' }).eq('id', requestId)
    if (error) {
      if (req) setPendingRequests(prev => [...prev, req])
      toast.error('Could not accept invite — try again')
    } else {
      toast.success(`Joined ${req?.bands?.name ?? 'band'} 🤘`)
    }
  }

  const handleReject = async (requestId: string) => {
    const req = pendingRequests.find(r => r.id === requestId)
    setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    const { error } = await supabase.from('band_members').update({ status: 'rejected' }).eq('id', requestId)
    if (error) {
      if (req) setPendingRequests(prev => [...prev, req])
      toast.error('Could not reject invite — try again')
    }
  }

  const leaderBands = memberships.filter(m => m.role === 'leader')
  const memberBands = memberships.filter(m => m.role === 'member')

  // Profile completion
  let profileCompletionPercent = 100
  const profileMissing: string[] = []
  if (profileBasics) {
    const hasName = !!(profileBasics.first_name && profileBasics.last_name)
    const hasAvatar = !!profileBasics.avatar_url
    const hasRole = !!(profileBasics.is_producer || profileBasics.is_sound_engineer || profileBasics.is_musician || profileBasics.is_fan)
    const hasGenres = (profileBasics.genre_ids?.length ?? 0) > 0
    const flags = [hasName, hasAvatar, hasRole, hasGenres]
    const done = flags.filter(Boolean).length
    profileCompletionPercent = Math.round((done / flags.length) * 100)
    if (!hasName) profileMissing.push('Add your first and last name')
    if (!hasAvatar) profileMissing.push('Upload a profile photo')
    if (!hasRole) profileMissing.push('Choose at least one role (producer, engineer, musician, fan)')
    if (!hasGenres) profileMissing.push('Pick your favourite genres')
  } else {
    profileCompletionPercent = 0
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav />
      <div className="max-w-3xl mx-auto px-6 py-16 animate-pulse">
        <div className="h-14 bg-zinc-900 rounded w-56 mb-12" />
        <div className="flex flex-col gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="border border-zinc-800 rounded-xl p-6 flex items-center gap-6">
              <div className="w-16 h-16 rounded-lg bg-zinc-900 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-zinc-900 rounded w-40" />
                <div className="h-3 bg-zinc-900 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav username={username} onLogout={handleLogout} />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-display uppercase tracking-tight leading-none">
            Your<br /><span className="text-red-500">Dashboard</span>
          </h1>
        </div>

        {/* Profile completion nudge */}
        {profileBasics && profileCompletionPercent < 100 && (
          <div className="mb-10 border border-zinc-800 rounded-xl p-5 bg-zinc-950/70">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Complete your profile ({profileCompletionPercent}%)
              </p>
              {profileMissing.length > 0 && (
                <span className="text-[11px] text-zinc-500">
                  {profileMissing.length} step{profileMissing.length > 1 ? 's' : ''} left
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden mb-3">
              <div
                className="h-full bg-red-600"
                style={{ width: `${profileCompletionPercent}%` }}
              />
            </div>
            {profileMissing.length > 0 && (
              <ul className="text-xs text-zinc-500 space-y-1 mb-4 list-disc list-inside">
                {profileMissing.slice(0, 3).map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-200 hover:border-red-500 hover:text-white transition-colors"
            >
              Go to profile settings
            </Link>
          </div>
        )}

        {/* Band invitations for you */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-red-500 mb-3">
              ⚡ Band Invitations ({pendingRequests.length})
            </p>
            <div className="flex flex-col gap-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="border border-red-900/40 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-sm">
                      <span className="text-zinc-500">You’ve been invited to join </span>
                      <span className="text-white">{req.bands?.name}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(req.id)}
                      className="bg-green-700 hover:bg-green-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
                      Accept
                    </button>
                    <button onClick={() => handleReject(req.id)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {memberships.length === 0 ? (
          (() => {
            const primary = profileBasics?.primary_profile
            const isProducerOrEngineer = primary === 'producer' || primary === 'engineer' || (!primary && (profileBasics?.is_producer || profileBasics?.is_sound_engineer))
            return (
              <div className="border border-zinc-800 rounded-xl p-16 text-center">
                <p className="text-5xl mb-5">{isProducerOrEngineer ? '🎚' : '🎸'}</p>
                <h2 className="text-xl font-black uppercase tracking-wide mb-3">
                  {isProducerOrEngineer ? 'Explore the community' : 'No bands yet'}
                </h2>
                <p className="text-zinc-500 text-sm mb-8 max-w-sm mx-auto">
                  {isProducerOrEngineer
                    ? 'Explore bands and demos from musicians looking for producers and engineers.'
                    : 'Create your own band or request to join an existing one.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {isProducerOrEngineer ? (
                    <>
                      <Link href="/explore"
                        className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-8 py-3 rounded-lg transition-colors">
                        Explore Bands
                      </Link>
                      <Link href="/demos"
                        className="inline-block border border-zinc-700 hover:border-red-500 text-zinc-300 hover:text-white font-bold uppercase tracking-widest px-8 py-3 rounded-lg transition-colors">
                        Explore Demos
                      </Link>
                    </>
                  ) : (
                    <Link href="/dashboard/create-band"
                      className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-8 py-3 rounded-lg transition-colors">
                      Create Band
                    </Link>
                  )}
                </div>
              </div>
            )
          })()
        ) : (
          <div className="flex flex-col gap-10">

            {/* Bands you lead */}
            {leaderBands.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">
                  Bands You Lead ({leaderBands.length})
                </p>
                <div className="flex flex-col gap-3">
                  {leaderBands.map(m => {
                    const band = m.bands
                    const bandReleases = releases.filter(r => r.band_id === m.band_id)
                    const hasLogo = !!band.logo_url
                    const hasPublishedRelease = bandReleases.some((r: any) => r.published)
                    const hasBioOrInfluence = !!(band as any).description || bandsWithInfluences.includes(band.id)
                    const hasShow = bandsWithShows.includes(band.id)
                    const checklistFlags = [hasLogo, hasPublishedRelease, hasBioOrInfluence, hasShow]
                    const checklistDone = checklistFlags.filter(Boolean).length
                    const checklistTotal = checklistFlags.length
                    const checklistPercent = Math.round((checklistDone / checklistTotal) * 100)
                    return (
                      <Link key={m.band_id} href={`/dashboard/manage/${m.band_id}`}
                        className="group border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 flex items-start gap-6 transition-all hover:bg-zinc-950">
                        <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {band.logo_url
                            ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                            : <span className="text-2xl">🤘</span>
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-black uppercase tracking-wide group-hover:text-red-500 transition-colors">
                              {band.name}
                            </h2>
                            <span className="text-xs bg-red-900/30 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              Leader
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                              band.is_published
                                ? 'text-green-500 border-green-800 bg-green-950/30'
                                : 'text-zinc-500 border-zinc-700 bg-zinc-900'
                            }`}>
                              {band.is_published ? '● Published' : '○ Draft'}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-zinc-600 mt-1">
                            {band.country && <span>{band.country}</span>}
                            {band.year_formed && <span>Est. {band.year_formed}</span>}
                            <span>{bandReleases.length} release{bandReleases.length !== 1 ? 's' : ''}</span>
                          </div>

                          {/* Band onboarding checklist */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-1">
                              <span className="uppercase tracking-widest">Band setup</span>
                              <span>{checklistDone}/{checklistTotal} done</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden mb-2">
                              <div
                                className="h-full bg-red-600"
                                style={{ width: `${checklistPercent}%` }}
                              />
                            </div>
                            <ul className="text-[11px] text-zinc-500 space-y-1.5">
                              <li className="flex items-center gap-2">
                                <span className={`inline-flex w-4 h-4 rounded-full border items-center justify-center ${
                                  hasLogo ? 'border-green-500 bg-green-600/20 text-green-400' : 'border-zinc-700'
                                }`}>
                                  {hasLogo && <span className="text-[10px]">✓</span>}
                                </span>
                                Add band logo
                              </li>
                              <li className="flex items-center gap-2">
                                <span className={`inline-flex w-4 h-4 rounded-full border items-center justify-center ${
                                  hasPublishedRelease ? 'border-green-500 bg-green-600/20 text-green-400' : 'border-zinc-700'
                                }`}>
                                  {hasPublishedRelease && <span className="text-[10px]">✓</span>}
                                </span>
                                Publish your first release
                              </li>
                              <li className="flex items-center gap-2">
                                <span className={`inline-flex w-4 h-4 rounded-full border items-center justify-center ${
                                  hasBioOrInfluence ? 'border-green-500 bg-green-600/20 text-green-400' : 'border-zinc-700'
                                }`}>
                                  {hasBioOrInfluence && <span className="text-[10px]">✓</span>}
                                </span>
                                Add band bio & influences
                              </li>
                              <li className="flex items-center gap-2">
                                <span className={`inline-flex w-4 h-4 rounded-full border items-center justify-center ${
                                  hasShow ? 'border-green-500 bg-green-600/20 text-green-400' : 'border-zinc-700'
                                }`}>
                                  {hasShow && <span className="text-[10px]">✓</span>}
                                </span>
                                Share your first show
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div className="text-zinc-600 group-hover:text-red-500 transition-colors self-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bands you're a member of */}
            {memberBands.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">
                  Bands You're In ({memberBands.length})
                </p>
                <div className="flex flex-col gap-3">
                  {memberBands.map(m => {
                    const band = m.bands
                    return (
                      <Link key={m.band_id} href={`/bands/${band.slug}`}
                        className="group border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 flex items-center gap-6 transition-all hover:bg-zinc-950">
                        <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {band.logo_url
                            ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                            : <span className="text-2xl">🤘</span>
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black uppercase tracking-wide group-hover:text-red-500 transition-colors">
                              {band.name}
                            </h2>
                            <span className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              Member
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-zinc-600 mt-1">
                            {band.country && <span>{band.country}</span>}
                            {band.year_formed && <span>Est. {band.year_formed}</span>}
                          </div>
                        </div>
                        <div className="text-zinc-600 group-hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/create-band"
                  className="border border-zinc-800 hover:border-red-600 rounded-xl p-5 transition-all hover:bg-zinc-950 group">
                  <p className="text-2xl mb-3">🎸</p>
                  <p className="font-bold uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">Create New Band</p>
                  <p className="text-xs text-zinc-600 mt-1">Start a new band profile</p>
                </Link>
                <Link href="/explore"
                  className="border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all hover:bg-zinc-950 group">
                  <p className="text-2xl mb-3">🔍</p>
                  <p className="font-bold uppercase tracking-wide text-sm group-hover:text-white transition-colors">Browse Bands</p>
                  <p className="text-xs text-zinc-600 mt-1">Discover metal bands</p>
                </Link>
                <Link href="/dashboard/profile"
                  className="border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all hover:bg-zinc-950 group">
                  <p className="text-2xl mb-3">👤</p>
                  <p className="font-bold uppercase tracking-wide text-sm group-hover:text-white transition-colors">Profile Settings</p>
                  <p className="text-xs text-zinc-600 mt-1">Update your name, username, password</p>
                </Link>
              </div>
            </div>

            {/* Recent releases across all bands */}
            {releases.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">Recent Releases</p>
                <div className="flex flex-col gap-2">
                  {releases.slice(0, 5).map(release => {
                    const band = memberships.find(m => m.band_id === release.band_id)?.bands
                    return (
                      <div key={release.id} className="border border-zinc-800 rounded-xl px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {release.cover_url
                            ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                            : <span className="text-lg">🎵</span>
                          }
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{release.title}</p>
                          <p className="text-xs text-zinc-600">
                            {release.release_type}{release.release_year ? ` · ${release.release_year}` : ''}
                            {band ? ` · ${band.name}` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* People you follow — always visible */}
        {following.length > 0 && (
          <div className="mt-10">
            <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">
              Following ({following.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {following.map(f => {
                const p = f.profiles as any
                const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
                return (
                  <Link key={f.following_id} href={`/members/${p.username}`}
                    className="flex items-center gap-2 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 transition-colors group">
                    <span className="text-sm font-bold group-hover:text-red-500 transition-colors">{displayName}</span>
                    <span className="text-xs text-zinc-600">@{p.username}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
