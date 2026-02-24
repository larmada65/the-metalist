'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'

type Profile = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  created_at: string
  bio: string | null
  instagram_url: string | null
  twitter_url: string | null
  website_url: string | null
  is_producer: boolean
  is_sound_engineer: boolean
}

type Membership = {
  id: string
  instrument: string
  join_year: number | null
  role: string
  bands: {
    name: string
    slug: string
    logo_url: string | null
    country: string | null
    year_formed: number | null
  }
}

const INSTRUMENT_EMOJI: Record<string, string> = {
  'Vocals': '🎤', 'Guitar': '🎸', 'Bass': '🎸', 'Drums': '🥁',
  'Keyboards': '🎹', 'Violin': '🎻', 'Cello': '🎻', 'Trumpet': '🎺',
  'Saxophone': '🎷', 'Flute': '🪈', 'DJ / Turntables': '🎧',
}

function avatarBg(str: string): string {
  const palette = ['#7f1d1d','#78350f','#14532d','#1e3a5f','#4c1d95','#831843','#134e4a','#3b0764']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

function primaryEmoji(instrument: string): string {
  return INSTRUMENT_EMOJI[instrument.split(',')[0].trim()] || '🎵'
}

export default function MemberProfileClient({ username }: { username: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, created_at, bio, instagram_url, twitter_url, website_url, is_producer, is_sound_engineer')
        .eq('username', username)
        .single()

      if (!profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)

      const [
        { data: membershipData },
        { count: followers },
        { count: following },
      ] = await Promise.all([
        supabase
          .from('band_members')
          .select('id, instrument, join_year, role, bands(name, slug, logo_url, country, year_formed)')
          .eq('profile_id', profileData.id)
          .eq('status', 'approved')
          .order('role'),
        supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id),
        supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id),
      ])

      if (membershipData) setMemberships(membershipData as any)
      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)

      // Check if current user follows this profile
      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle()
        setIsFollowing(!!followData)
      }

      setLoading(false)
    }
    load()
  }, [username])

  const handleFollow = async () => {
    if (!currentUser || !profile || followLoading) return
    setFollowLoading(true)

    if (isFollowing) {
      await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUser)
        .eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase
        .from('user_follows')
        .insert({ follower_id: currentUser, following_id: profile.id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)

      // Notify the followed user
      const { data: followerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUser)
        .single()
      if (followerProfile) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          title: `${followerProfile.username} is now following you`,
          body: null,
          href: `/members/${followerProfile.username}`,
        })
      }
    }

    setFollowLoading(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-600 animate-pulse">Loading...</p>
    </main>
  )

  if (notFound) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-500 text-xl">Member not found.</p>
      <Link href="/explore" className="text-red-500 hover:text-red-400 text-sm">← Back to explore</Link>
    </main>
  )

  const p = profile!
  const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
  const initial = displayName[0]?.toUpperCase() || '?'
  const joinedDate = new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const isOwnProfile = currentUser === p.id

  // Aggregate unique instruments across all bands
  const allInstruments = [...new Set(
    memberships.flatMap(m => m.instrument.split(',').map(s => s.trim()))
  )].filter(Boolean)

  const hasSocials = p.instagram_url || p.twitter_url || p.website_url

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Explore" />

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* ── Profile header ─────────────────────────────────────── */}
        <div className="flex items-start gap-6 mb-6">
          {/* Initials avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 text-3xl font-black select-none"
            style={{ backgroundColor: avatarBg(p.username) }}>
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none truncate">
              {displayName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-zinc-500 text-sm">@{p.username}</p>
              {p.is_producer && (
                <span className="text-xs px-2 py-0.5 rounded border border-red-900/50 bg-red-950/30 text-red-400 uppercase tracking-widest font-medium">
                  Producer
                </span>
              )}
              {p.is_sound_engineer && (
                <span className="text-xs px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 uppercase tracking-widest font-medium">
                  Sound Engineer
                </span>
              )}
            </div>
            <p className="text-zinc-700 text-xs mt-1 uppercase tracking-widest">
              Member since {joinedDate}
            </p>
            {allInstruments.length > 0 && (
              <p className="text-zinc-500 text-xs mt-2">
                {allInstruments.map(inst => `${INSTRUMENT_EMOJI[inst] || '🎵'} ${inst}`).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* ── Follow stats + button ───────────────────────────────── */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex gap-6">
            <div>
              <span className="text-lg font-black">{followerCount}</span>
              <span className="text-xs text-zinc-600 uppercase tracking-widest ml-1.5">Followers</span>
            </div>
            <div>
              <span className="text-lg font-black">{followingCount}</span>
              <span className="text-xs text-zinc-600 uppercase tracking-widest ml-1.5">Following</span>
            </div>
          </div>

          {!isOwnProfile && currentUser && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`ml-auto px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${
                isFollowing
                  ? 'bg-zinc-900 border-zinc-600 text-zinc-300 hover:border-red-500 hover:text-red-400'
                  : 'bg-red-600 border-red-600 text-white hover:bg-red-700'
              }`}>
              {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {!isOwnProfile && !currentUser && (
            <Link href="/login"
              className="ml-auto px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition-colors">
              Follow
            </Link>
          )}
        </div>

        {/* ── Bio ────────────────────────────────────────────────── */}
        {p.bio && (
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 text-justify border-l-2 border-zinc-800 pl-4">
            {p.bio}
          </p>
        )}

        {/* ── Social links ───────────────────────────────────────── */}
        {hasSocials && (
          <div className="flex gap-3 flex-wrap mb-10">
            {p.instagram_url && (
              <a href={p.instagram_url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-red-500 hover:text-white transition-colors uppercase tracking-widest">
                Instagram
              </a>
            )}
            {p.twitter_url && (
              <a href={p.twitter_url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-red-500 hover:text-white transition-colors uppercase tracking-widest">
                Twitter / X
              </a>
            )}
            {p.website_url && (
              <a href={p.website_url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-red-500 hover:text-white transition-colors uppercase tracking-widest">
                Website
              </a>
            )}
          </div>
        )}

        {/* ── Bands ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">
            Bands ({memberships.length})
          </h2>

          {memberships.length === 0 ? (
            <div className="border border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-700 uppercase tracking-widest text-sm">Not in any bands yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {memberships.map(m => {
                const band = m.bands as any
                return (
                  <Link key={m.id} href={`/bands/${band.slug}`}
                    className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-600 transition-all group">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {band.logo_url
                        ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                        : <span className="text-xl opacity-20">🤘</span>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">
                          {band.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                          m.role === 'leader'
                            ? 'border-red-900/50 text-red-500 bg-red-950/30'
                            : 'border-zinc-700 text-zinc-500'
                        }`}>
                          {m.role === 'leader' ? '👑 Leader' : 'Member'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {primaryEmoji(m.instrument)} {m.instrument}
                      </p>
                      <p className="text-xs text-zinc-700 mt-0.5">
                        {[
                          band.country,
                          band.year_formed && `Est. ${band.year_formed}`,
                          m.join_year && `since ${m.join_year}`,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    <span className="text-zinc-700 group-hover:text-red-500 transition-colors shrink-0">→</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
