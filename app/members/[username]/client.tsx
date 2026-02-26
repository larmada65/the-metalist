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
  avatar_url: string | null
  musician_instruments: string[] | null
  musician_level: string | null
  musician_link: string | null
  production_level: string | null
  studio_gear: string | null
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

type UserReview = {
  id: string
  title: string
  content: string
  rating: number | null
  created_at: string
  release_id: string
  release_title: string
  cover_url: string | null
  band_name: string
  band_slug: string
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
  const [reviewCount, setReviewCount] = useState(0)
  const [bandFollowCount, setBandFollowCount] = useState(0)
  const [leaderBands, setLeaderBands] = useState<{ id: string; name: string }[]>([])
  const [inviteBandId, setInviteBandId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [userReviews, setUserReviews] = useState<UserReview[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, created_at, bio, instagram_url, twitter_url, website_url, is_producer, is_sound_engineer, avatar_url, musician_instruments, musician_level, musician_link, production_level, studio_gear')
        .eq('username', username)
        .single()

      if (!profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)

      const [
        { data: membershipData },
        { count: followers },
        { count: following },
        { count: reviews },
        { count: bandFollows },
        { data: reviewsList },
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
        supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileData.id),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileData.id),
        supabase
          .from('reviews')
          .select('id, title, content, rating, created_at, releases(id, title, cover_url, bands(name, slug))')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      if (membershipData) setMemberships(membershipData as any)
      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)
      setReviewCount(reviews || 0)
      setBandFollowCount(bandFollows || 0)

      if (reviewsList) {
        setUserReviews(
          (reviewsList as any[]).map(r => ({
            id: r.id,
            title: r.title,
            content: r.content,
            rating: r.rating,
            created_at: r.created_at,
            release_id: r.releases?.id,
            release_title: r.releases?.title || '',
            cover_url: r.releases?.cover_url || null,
            band_name: r.releases?.bands?.name || '',
            band_slug: r.releases?.bands?.slug || '',
          }))
        )
      }

      // Check if current user follows this profile
      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle()
        setIsFollowing(!!followData)

        // Load bands where current user is leader (for invite-to-band action)
        const { data: leaderData } = await supabase
          .from('band_members')
          .select('band_id, bands(name)')
          .eq('profile_id', user.id)
          .eq('role', 'leader')
          .eq('status', 'approved')
        if (leaderData) {
          setLeaderBands(
            (leaderData as any[]).map(m => ({
              id: m.band_id,
              name: m.bands?.name || 'Untitled band',
            }))
          )
        }
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

  const handleInviteToBand = async () => {
    if (!currentUser || !profile || !inviteBandId || inviteLoading) return
    setInviteLoading(true)
    setInviteError(null)
    setInviteSuccess(false)

    // Avoid duplicate membership / invite
    const { data: existing } = await supabase
      .from('band_members')
      .select('id, status')
      .eq('band_id', inviteBandId)
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (existing) {
      setInviteError('This member already has a membership or pending invite for that band.')
      setInviteLoading(false)
      return
    }

    const bandMeta = leaderBands.find(b => b.id === inviteBandId)

    const { error } = await supabase.from('band_members').insert({
      band_id: inviteBandId,
      profile_id: profile.id,
      name: null,
      instrument: null,
      join_year: null,
      country: null,
      role: 'member',
      status: 'invited',
      display_order: 999,
    })

    if (error) {
      setInviteError(error.message)
      setInviteLoading(false)
      return
    }

    try {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: `Invitation to join ${bandMeta?.name ?? 'a band'}`,
        body: 'Open your dashboard to accept or decline the invitation.',
        href: '/dashboard',
      })
    } catch (_) {}

    setInviteSuccess(true)
    setInviteLoading(false)
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
      <GlobalNav backHref="/explore" backLabel="Bands" />

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* ── Profile header ─────────────────────────────────────── */}
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center text-3xl font-black select-none"
            style={p.avatar_url ? {} : { backgroundColor: avatarBg(p.username) }}>
            {p.avatar_url
              ? <img src={p.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              : initial
            }
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none truncate">
              {displayName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-zinc-500 text-sm">@{p.username}</p>
              {p.username === 'larmada' && (
                <span className="text-xs px-2 py-0.5 rounded border border-amber-600/60 bg-amber-950/40 text-amber-400 uppercase tracking-widest font-bold">
                  Founder
                </span>
              )}
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
            <div className="ml-auto flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Link href={`/messages/${p.username}`}
                  className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors">
                  Message
                </Link>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${
                    isFollowing
                      ? 'bg-zinc-900 border-zinc-600 text-zinc-300 hover:border-red-500 hover:text-red-400'
                      : 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                  }`}>
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
              {leaderBands.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={inviteBandId}
                    onChange={e => { setInviteBandId(e.target.value); setInviteError(null); setInviteSuccess(false) }}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="">Invite to band…</option>
                    {leaderBands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleInviteToBand}
                    disabled={!inviteBandId || inviteLoading}
                    className="px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {inviteLoading ? 'Sending...' : `Request to join band`}
                  </button>
                </div>
              )}
              {inviteSuccess && (
                <p className="text-[11px] text-green-400">Invitation sent. They can accept from their dashboard.</p>
              )}
              {inviteError && (
                <p className="text-[11px] text-red-400">{inviteError}</p>
              )}
            </div>
          )}

          {!isOwnProfile && !currentUser && (
            <Link href="/login"
              className="ml-auto px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition-colors">
              Follow
            </Link>
          )}

          {isOwnProfile && (
            <Link href="/dashboard/profile"
              className="ml-auto px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white transition-colors flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
              </svg>
              Edit Profile
            </Link>
          )}
        </div>

        {/* ── Badges ─────────────────────────────────────────────── */}
        {(() => {
          const badges: { emoji: string; label: string; title: string }[] = []
          if (p.username === 'larmada') badges.push({ emoji: '👑', label: 'Founder', title: 'Founded The Metalist' })
          const joinDate = new Date(p.created_at)
          const monthsOn = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          if (monthsOn >= 12) badges.push({ emoji: '🎖️', label: 'Veteran', title: 'Member for over a year' })
          if (reviewCount >= 1) badges.push({ emoji: '✍️', label: 'Critic', title: 'Wrote a review' })
          if (reviewCount >= 5) badges.push({ emoji: '🔥', label: 'Power Critic', title: '5+ reviews written' })
          if (reviewCount >= 20) badges.push({ emoji: '🏆', label: 'Legend', title: '20+ reviews written' })
          if (bandFollowCount >= 5) badges.push({ emoji: '🤘', label: 'Fan', title: 'Follows 5+ bands' })
          if (bandFollowCount >= 15) badges.push({ emoji: '🌑', label: 'Devotee', title: 'Follows 15+ bands' })
          if (memberships.some(m => m.role === 'leader')) badges.push({ emoji: '🎸', label: 'Bandleader', title: 'Leads a band' })
          else if (memberships.length > 0) badges.push({ emoji: '🥁', label: 'Musician', title: 'Member of a band' })
          if (p.is_producer) badges.push({ emoji: '🎚️', label: 'Producer', title: 'Music producer' })
          if (p.is_sound_engineer) badges.push({ emoji: '🔊', label: 'Engineer', title: 'Sound engineer' })
          if (badges.length === 0) return null

          // Progress towards next review/band-follow milestone
          const nextReviewMilestone =
            reviewCount < 1 ? { target: 1, label: 'Critic' }
            : reviewCount < 5 ? { target: 5, label: 'Power Critic' }
            : reviewCount < 20 ? { target: 20, label: 'Legend' }
            : null
          const remainingReviews = nextReviewMilestone ? nextReviewMilestone.target - reviewCount : 0

          const nextBandMilestone =
            bandFollowCount < 5 ? { target: 5, label: 'Fan' }
            : bandFollowCount < 15 ? { target: 15, label: 'Devotee' }
            : null
          const remainingBands = nextBandMilestone ? nextBandMilestone.target - bandFollowCount : 0

          return (
            <div className="mb-8">
              <div className="flex flex-wrap gap-2 mb-2">
                {badges.map(b => (
                  <div key={b.label} title={b.title}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 cursor-default">
                    <span>{b.emoji}</span>
                    <span className="uppercase tracking-widest font-medium">{b.label}</span>
                  </div>
                ))}
              </div>
              {(nextReviewMilestone || nextBandMilestone) && (
                <p className="text-[11px] text-zinc-600">
                  {nextReviewMilestone && remainingReviews > 0 && (
                    <span>
                      Write {remainingReviews} more review{remainingReviews !== 1 ? 's' : ''} to reach{' '}
                      <span className="text-zinc-400">{nextReviewMilestone.label}</span>.
                    </span>
                  )}
                  {nextReviewMilestone && nextBandMilestone && remainingReviews > 0 && remainingBands > 0 && (
                    <span>{' '}</span>
                  )}
                  {nextBandMilestone && remainingBands > 0 && (
                    <span>
                      Follow {remainingBands} more band{remainingBands !== 1 ? 's' : ''} to unlock{' '}
                      <span className="text-zinc-400">{nextBandMilestone.label}</span>.
                    </span>
                  )}
                </p>
              )}
            </div>
          )
        })()}

        {/* ── Bio ────────────────────────────────────────────────── */}
        {p.bio && (
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 text-justify border-l-2 border-zinc-800 pl-4">
            {p.bio}
          </p>
        )}

        {/* ── Musician section ───────────────────────────────────── */}
        {(p.musician_instruments?.length || p.musician_level || p.musician_link) && (
          <div className="border border-zinc-800 rounded-xl p-5 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">As a Musician</h2>
            {p.musician_instruments && p.musician_instruments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.musician_instruments.map(inst => (
                  <span key={inst} className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400">
                    {inst}
                  </span>
                ))}
              </div>
            )}
            {p.musician_level && (
              <p className="text-xs text-zinc-500 mb-2">
                <span className="text-zinc-700 uppercase tracking-widest mr-2">Level</span>
                {p.musician_level}
              </p>
            )}
            {p.musician_link && (
              <a href={p.musician_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Watch / Listen
              </a>
            )}
          </div>
        )}

        {/* ── Producer / Engineer section ────────────────────────── */}
        {(p.is_producer || p.is_sound_engineer) && (p.production_level || p.studio_gear) && (
          <div className="border border-zinc-800 rounded-xl p-5 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
              {p.is_producer && p.is_sound_engineer ? 'Production & Engineering' : p.is_producer ? 'As a Producer' : 'As a Sound Engineer'}
            </h2>
            {p.production_level && (
              <p className="text-xs text-zinc-500 mb-3">
                <span className="text-zinc-700 uppercase tracking-widest mr-2">Level</span>
                {p.production_level}
              </p>
            )}
            {p.studio_gear && (
              <div>
                <p className="text-xs text-zinc-700 uppercase tracking-widest mb-1">Equipment & Software</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{p.studio_gear}</p>
              </div>
            )}
          </div>
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
                    className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-all group">
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

        {/* ── Reviews ────────────────────────────────────────────── */}
        {userReviews.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">
              Reviews ({userReviews.length})
            </h2>
            <div className="flex flex-col gap-3">
              {userReviews.map(r => (
                <Link key={r.id} href={`/reviews/${r.id}`}
                  className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group">
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {r.cover_url
                      ? <img src={r.cover_url} alt={r.release_title} className="w-full h-full object-cover" />
                      : <span className="text-xl opacity-20">🎵</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5 truncate">
                      {r.band_name}
                    </p>
                    <p className="text-xs text-zinc-700 truncate mb-1">
                      {r.release_title}
                    </p>
                    <p className="text-sm font-black uppercase tracking-wide text-white group-hover:text-red-500 transition-colors truncate">
                      {r.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">
                      {r.content}
                    </p>
                  </div>
                  {r.rating !== null && (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded border shrink-0 ${
                      r.rating >= 15 ? 'text-green-400 bg-green-950/40 border-green-900/50'
                      : r.rating >= 10 ? 'text-yellow-400 bg-yellow-950/40 border-yellow-900/50'
                      : 'text-red-400 bg-red-950/40 border-red-900/50'
                    }`}>
                      {r.rating.toFixed(1)}/20
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
