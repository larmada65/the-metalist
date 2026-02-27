'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'
import { createClient } from '../../../lib/supabase'
import { useAudioPlayer } from '../../../components/AudioPlayerProvider'
import { canUploadDemo, normalizeTier, type SubscriptionTier } from '../../../lib/subscriptions'

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
  is_musician: boolean
  is_fan: boolean
  avatar_url: string | null
  musician_instruments: string[] | null
  musician_level: string | null
  musician_link: string | null
  production_level: string | null
  studio_gear: string | null
  producer_software: string | null
  producer_guitar_plugins: string | null
  producer_drum_plugins: string | null
  producer_bass_plugins: string | null
  producer_genre_ids: number[] | null
  producer_portfolio_links: { url: string; label?: string }[] | null
  producer_specialization: string | null
  producer_availability: string | null
  primary_profile: string | null
}

type Genre = { id: number; name: string }

type Demo = {
  id: string
  title: string | null
  audio_path: string
  visibility: 'public' | 'private' | 'selected_users'
  key: string | null
  tempo: number | null
  created_at: string
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

// Portfolio embed helpers for YouTube, SoundCloud, Bandcamp
function getEmbedForUrl(url: string): { type: 'youtube' | 'soundcloud'; embedUrl: string } | null {
  try {
    const u = url.trim().toLowerCase()
    if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) {
      const vidMatch = u.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:\?|&|$)/) || u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
      const vid = vidMatch?.[1]
      if (vid) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${vid}` }
    }
    if (u.includes('soundcloud.com/')) {
      return { type: 'soundcloud', embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.trim())}&auto_play=false&hide_related=true` }
    }
  } catch (_) {}
  return null
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
  const [demos, setDemos] = useState<Demo[]>([])
  const [showAddDemo, setShowAddDemo] = useState(false)
  const [demoTitle, setDemoTitle] = useState('')
  const [demoKey, setDemoKey] = useState('')
  const [demoTempo, setDemoTempo] = useState('')
  const [demoFile, setDemoFile] = useState<File | null>(null)
  const [demoVisibility, setDemoVisibility] = useState<'public' | 'private' | 'selected_users'>('public')
  const [demoShareUsernames, setDemoShareUsernames] = useState('')
  const [demoUploading, setDemoUploading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free')
  const [demosThisMonth, setDemosThisMonth] = useState(0)
  const [editingDemoId, setEditingDemoId] = useState<string | null>(null)
  const [editDemoTitle, setEditDemoTitle] = useState('')
  const [editDemoKey, setEditDemoKey] = useState('')
  const [editDemoTempo, setEditDemoTempo] = useState('')
  const [editDemoVisibility, setEditDemoVisibility] = useState<'public' | 'private' | 'selected_users'>('public')
  const [editDemoShareUsernames, setEditDemoShareUsernames] = useState('')
  const [editDemoSaving, setEditDemoSaving] = useState(false)
  const [deleteDemoId, setDeleteDemoId] = useState<string | null>(null)
  const [deleteDemoLoading, setDeleteDemoLoading] = useState(false)
  const [genresList, setGenresList] = useState<Genre[]>([])
  const supabase = createClient()
  const { setTrackAndPlay } = useAudioPlayer()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user.id)

      const qUsername = username.trim()
      // Safest: columns that exist before migrations 008/009/011
      const minimalCols = 'id, username, first_name, last_name, created_at, bio, instagram_url, twitter_url, website_url, is_producer, is_sound_engineer, is_musician, is_fan, avatar_url, musician_instruments, musician_level, musician_link, production_level, studio_gear'
      const withPrimary = minimalCols + ', primary_profile'
      const producerCols = ', producer_software, producer_guitar_plugins, producer_drum_plugins, producer_bass_plugins, producer_genre_ids, producer_portfolio_links, producer_specialization, producer_availability'

      type ProfileRow = Record<string, unknown> | null
      let profileData: ProfileRow = null

      // Try full select first, then fall back to fewer columns (in case migrations 008/009/011 not run)
      for (const cols of [withPrimary + producerCols, withPrimary, minimalCols]) {
        const { data, error } = await supabase
          .from('profiles')
          .select(cols)
          .ilike('username', qUsername)
          .maybeSingle()
        if (!error && data && typeof data === 'object' && !('error' in data)) {
          profileData = data as unknown as ProfileRow
          break
        }
      }

      if (!profileData && user) {
        for (const cols of [withPrimary, minimalCols]) {
          const { data: ownProfile, error: ownErr } = await supabase
            .from('profiles')
            .select(cols)
            .eq('id', user.id)
            .single()
          if (!ownErr && ownProfile && typeof ownProfile === 'object' && !('error' in ownProfile) && (ownProfile as Record<string, unknown>).username && String((ownProfile as Record<string, unknown>).username).toLowerCase() === qUsername.toLowerCase()) {
            profileData = ownProfile as unknown as ProfileRow
            break
          }
        }
      }

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const pData = profileData as Record<string, unknown>
      const fullProfile: Profile = {
        ...profileData,
        producer_software: (typeof pData.producer_software === 'string' ? pData.producer_software : null) as string | null,
        producer_guitar_plugins: (typeof pData.producer_guitar_plugins === 'string' ? pData.producer_guitar_plugins : null) as string | null,
        producer_drum_plugins: (typeof pData.producer_drum_plugins === 'string' ? pData.producer_drum_plugins : null) as string | null,
        producer_bass_plugins: (typeof pData.producer_bass_plugins === 'string' ? pData.producer_bass_plugins : null) as string | null,
        producer_genre_ids: (Array.isArray(pData.producer_genre_ids) ? pData.producer_genre_ids : null) as number[] | null,
        producer_portfolio_links: (Array.isArray(pData.producer_portfolio_links) ? pData.producer_portfolio_links : null) as { url: string; label?: string }[] | null,
        producer_specialization: (typeof pData.producer_specialization === 'string' ? pData.producer_specialization : null) as string | null,
        producer_availability: (typeof pData.producer_availability === 'string' ? pData.producer_availability : null) as string | null,
        primary_profile: (typeof pData.primary_profile === 'string' ? pData.primary_profile : null) as string | null,
      } as Profile
      setProfile(fullProfile)

      const [
        { data: membershipData },
        { count: followers },
        { count: following },
        { count: reviews },
        { count: bandFollows },
        { data: reviewsList },
        { data: demosData },
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
        supabase
          .from('demos')
          .select('id, title, audio_path, visibility, key, tempo, created_at')
          .eq('profile_id', profileData.id)
          .order('created_at', { ascending: false }),
      ])

      if (membershipData) setMemberships(membershipData as any)
      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)
      setReviewCount(reviews || 0)
      setBandFollowCount(bandFollows || 0)

      if (demosData) setDemos(demosData as Demo[])

      const { data: genresData } = await supabase.from('genres_list').select('id, name').order('name')
      if (genresData) setGenresList(genresData)

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

      // Own profile: fetch subscription and demo count for upload check
      if (user && profileData.id === user.id) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('user_id', user.id)
          .maybeSingle()
        const tier = normalizeTier(sub?.tier as string)
        setSubscriptionTier(tier)

        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { count } = await supabase
          .from('demos')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', user.id)
          .gte('created_at', monthStart)
        setDemosThisMonth(count || 0)
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

  const handleUploadDemo = async () => {
    if (!currentUser || !profile || currentUser !== profile.id) return
    const check = canUploadDemo(subscriptionTier, demosThisMonth)
    if (!check.allowed) { setDemoError(check.reason || ''); return }
    if (!demoFile) { setDemoError('Select an MP3 file.'); return }
    if (!demoFile.name.toLowerCase().endsWith('.mp3')) { setDemoError('File must be MP3.'); return }
    setDemoUploading(true)
    setDemoError(null)

    const demoId = crypto.randomUUID()
    const path = `demos/${profile.id}/${demoId}.mp3`

    const { error: uploadErr } = await supabase.storage
      .from('band-logos')
      .upload(path, demoFile, { contentType: 'audio/mpeg' })

    if (uploadErr) {
      setDemoError('Upload failed: ' + uploadErr.message)
      setDemoUploading(false)
      return
    }

    const tempoNum = demoTempo.trim() ? parseInt(demoTempo.trim(), 10) : null
    const { data: inserted, error: insertErr } = await supabase
      .from('demos')
      .insert({
        id: demoId,
        profile_id: profile.id,
        title: demoTitle.trim() || null,
        audio_path: path,
        visibility: demoVisibility,
        key: demoKey.trim() || null,
        tempo: tempoNum && !isNaN(tempoNum) ? tempoNum : null,
      })
      .select()
      .single()

    if (insertErr) {
      setDemoError(insertErr.message)
      setDemoUploading(false)
      return
    }

    if (demoVisibility === 'selected_users' && demoShareUsernames.trim()) {
      const usernames = demoShareUsernames.split(/[,\s]+/).map(u => u.trim().toLowerCase()).filter(Boolean)
      if (usernames.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .in('username', usernames)
        if (users && users.length > 0) {
          await supabase.from('demo_shares').insert(
            users.map(u => ({ demo_id: demoId, user_id: u.id }))
          )
        }
      }
    }

    setDemos(prev => [inserted as Demo, ...prev])
    setDemosThisMonth(c => c + 1)
    setShowAddDemo(false)
    setDemoTitle('')
    setDemoKey('')
    setDemoTempo('')
    setDemoFile(null)
    setDemoShareUsernames('')
    setDemoVisibility('public')
    setDemoUploading(false)
  }

  const startEditDemo = (d: Demo) => {
    setEditingDemoId(d.id)
    setEditDemoTitle(d.title || '')
    setEditDemoKey(d.key || '')
    setEditDemoTempo(d.tempo != null ? String(d.tempo) : '')
    setEditDemoVisibility(d.visibility)
    setEditDemoShareUsernames('')
  }

  const handleSaveEditDemo = async () => {
    if (!editingDemoId || !currentUser || !profile || currentUser !== profile.id) return
    setEditDemoSaving(true)
    const tempoNum = editDemoTempo.trim() ? parseInt(editDemoTempo.trim(), 10) : null
    const { error } = await supabase
      .from('demos')
      .update({
        title: editDemoTitle.trim() || null,
        visibility: editDemoVisibility,
        key: editDemoKey.trim() || null,
        tempo: tempoNum && !isNaN(tempoNum) ? tempoNum : null,
      })
      .eq('id', editingDemoId)
      .eq('profile_id', profile.id)

    if (error) {
      setEditDemoSaving(false)
      return
    }

    await supabase.from('demo_shares').delete().eq('demo_id', editingDemoId)
    if (editDemoVisibility === 'selected_users' && editDemoShareUsernames.trim()) {
      const usernames = editDemoShareUsernames.split(/[,\s]+/).map(u => u.trim().toLowerCase()).filter(Boolean)
      if (usernames.length > 0) {
        const { data: users } = await supabase.from('profiles').select('id').in('username', usernames)
        if (users?.length) {
          await supabase.from('demo_shares').insert(users.map(u => ({ demo_id: editingDemoId, user_id: u.id })))
        }
      }
    }

    const keyVal = editDemoKey.trim() || null
    const tempoVal = tempoNum && !isNaN(tempoNum) ? tempoNum : null
    setDemos(prev => prev.map(d =>
      d.id === editingDemoId
        ? { ...d, title: editDemoTitle.trim() || null, visibility: editDemoVisibility, key: keyVal, tempo: tempoVal }
        : d
    ))
    setEditingDemoId(null)
    setEditDemoSaving(false)
  }

  const handleDeleteDemo = async (demoId: string) => {
    if (!currentUser || !profile || currentUser !== profile.id || deleteDemoLoading) return
    setDeleteDemoLoading(true)
    const demo = demos.find(d => d.id === demoId)
    if (demo) {
      const { error } = await supabase.from('demos').delete().eq('id', demoId).eq('profile_id', profile.id)
      if (!error) {
        setDemos(prev => prev.filter(d => d.id !== demoId))
        setDemosThisMonth(c => Math.max(0, c - 1))
        setDeleteDemoId(null)
      }
    }
    setDeleteDemoLoading(false)
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
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6">
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
              {p.is_musician && (
                <span className="text-xs px-2 py-0.5 rounded border border-amber-900/50 bg-amber-950/30 text-amber-400 uppercase tracking-widest font-medium">
                  Musician
                </span>
              )}
              {p.is_fan && (
                <span className="text-xs px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 uppercase tracking-widest font-medium">
                  Fan
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
          else if (p.is_musician) badges.push({ emoji: '🎸', label: 'Musician', title: 'Musician' })
          if (p.is_producer) badges.push({ emoji: '🎚️', label: 'Producer', title: 'Music producer' })
          if (p.is_sound_engineer) badges.push({ emoji: '🔊', label: 'Engineer', title: 'Sound engineer' })
          if (p.is_fan) badges.push({ emoji: '🎧', label: 'Fan', title: 'Metal fan discovering bands' })
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

        {/* ── Producer + Musician sections — order by primary_profile when both present ───────── */}
        {(() => {
          const hasMusician = p.is_musician && (p.musician_instruments?.length || p.musician_level || p.musician_link)
          const hasProducer = (p.is_producer || p.is_sound_engineer) && (
            p.producer_software || p.producer_guitar_plugins || p.producer_drum_plugins || p.producer_bass_plugins ||
            p.producer_genre_ids?.length || (p.producer_portfolio_links && p.producer_portfolio_links.length > 0) ||
            p.production_level || p.studio_gear || p.producer_specialization || p.producer_availability
          )
          const musicianFirst = hasMusician && hasProducer && p.primary_profile === 'musician'

          const musicianSection = hasMusician ? (
          <div key="musician" className="border border-amber-900/40 rounded-xl p-6 mb-6 bg-amber-950/20">
            <h2 className="text-xs uppercase tracking-widest text-amber-500/90 mb-1">As a Musician</h2>
            <p className="text-xs text-zinc-500 mb-4">Instruments, skill level & demos</p>
            {p.musician_instruments && p.musician_instruments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.musician_instruments.map(inst => (
                  <span key={inst} className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded text-xs text-zinc-400">
                    {INSTRUMENT_EMOJI[inst] || '🎵'} {inst}
                  </span>
                ))}
              </div>
            )}
            {p.musician_level && (
              <p className="text-xs text-zinc-500 mb-3">
                <span className="text-zinc-600 uppercase tracking-widest mr-2">Level</span>
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
          ) : null

          const producerSection = hasProducer ? (
          <div key="producer" className="border border-red-900/40 rounded-xl p-6 mb-6 bg-red-950/20">
            <h2 className="text-xs uppercase tracking-widest text-red-500/90 mb-1">
              {p.is_producer && p.is_sound_engineer ? 'Production & Engineering' : p.is_producer ? 'As a Producer' : 'As a Sound Engineer'}
            </h2>
            <p className="text-xs text-zinc-500 mb-4">Recording, mixing & production services</p>

            {/* Level + Availability — lead info */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {p.production_level && (
                <span className="px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900/80 text-xs text-zinc-400 uppercase tracking-widest">
                  {p.production_level}
                </span>
              )}
              {p.producer_availability && (
                <span className={`px-2.5 py-1 rounded border text-xs font-medium uppercase tracking-widest ${
                  p.producer_availability === 'open'
                    ? 'border-green-800/60 bg-green-950/40 text-green-400'
                    : p.producer_availability === 'limited'
                    ? 'border-amber-800/60 bg-amber-950/30 text-amber-400'
                    : 'border-zinc-700 bg-zinc-900/80 text-zinc-500'
                }`}>
                  {p.producer_availability === 'open' ? 'Open for projects' : p.producer_availability === 'limited' ? 'Limited capacity' : 'Currently booked'}
                </span>
              )}
            </div>

            {/* Specialization + Software + Genres */}
            {p.producer_specialization && (
              <p className="text-sm text-zinc-300 mb-3 italic">&ldquo;{p.producer_specialization}&rdquo;</p>
            )}
            {p.producer_software && (
              <div className="mb-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Software</p>
                <p className="text-sm text-zinc-400">{p.producer_software}</p>
              </div>
            )}
            {p.producer_genre_ids && p.producer_genre_ids.length > 0 && genresList.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1.5">Genres I&apos;m open to work on</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.producer_genre_ids.map(gid => {
                    const g = genresList.find(x => x.id === gid)
                    return g ? (
                      <span key={gid} className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded text-xs text-zinc-400">
                        {g.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}

            {/* Plugins + Equipment */}
            <div className="grid gap-3 mb-4 sm:grid-cols-2">
              {p.producer_guitar_plugins && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Guitar</p>
                  <p className="text-xs text-zinc-400">{p.producer_guitar_plugins}</p>
                </div>
              )}
              {p.producer_drum_plugins && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Drums</p>
                  <p className="text-xs text-zinc-400">{p.producer_drum_plugins}</p>
                </div>
              )}
              {p.producer_bass_plugins && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Bass</p>
                  <p className="text-xs text-zinc-400">{p.producer_bass_plugins}</p>
                </div>
              )}
            </div>
            {p.studio_gear && (
              <div className="mb-4">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Equipment & outboard</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{p.studio_gear}</p>
              </div>
            )}

            {/* Portfolio — embeds when possible */}
            {p.producer_portfolio_links && p.producer_portfolio_links.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Past work / Portfolio</p>
                <div className="flex flex-col gap-4">
                  {p.producer_portfolio_links.map((link, i) => {
                    if (!link.url) return null
                    const embed = getEmbedForUrl(link.url)
                    const label = link.label || link.url
                    if (embed?.type === 'youtube') {
                      return (
                        <div key={i}>
                          {link.label && <p className="text-xs text-zinc-500 mb-1">{link.label}</p>}
                          <div className="aspect-video rounded-lg overflow-hidden border border-zinc-800">
                            <iframe
                              src={embed.embedUrl}
                              title={label}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            />
                          </div>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:text-red-400 mt-1 inline-block">
                            Watch on YouTube ↗
                          </a>
                        </div>
                      )
                    }
                    if (embed?.type === 'soundcloud') {
                      return (
                        <div key={i}>
                          {link.label && <p className="text-xs text-zinc-500 mb-1">{link.label}</p>}
                          <iframe
                            width="100%"
                            height="120"
                            scrolling="no"
                            frameBorder="no"
                            allow="autoplay"
                            src={embed.embedUrl}
                            className="rounded-lg"
                            title={label}
                          />
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:text-red-400 mt-1 inline-block">
                            Listen on SoundCloud ↗
                          </a>
                        </div>
                      )
                    }
                    return (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {label}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          ) : null

          return musicianFirst ? <>{musicianSection}{producerSection}</> : <>{producerSection}{musicianSection}</>
        })()}

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

        {/* ── Demos ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500">
              Demos ({demos.length})
            </h2>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => { setShowAddDemo(!showAddDemo); setDemoError(null); setDemoFile(null); setDemoTitle(''); setDemoKey(''); setDemoTempo(''); setDemoShareUsernames(''); setDemoVisibility('public') }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white transition-colors"
              >
                {showAddDemo ? 'Cancel' : '+ Add demo'}
              </button>
            )}
          </div>

          {showAddDemo && isOwnProfile && (
            <div className="border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
              <p className="text-xs text-zinc-500">Upload an unfinished song (MP3) to share with producers or collaborators. Free: 1/month. Bedroom: 1/week. Pro/Pro+: unlimited.</p>
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Title (optional)</label>
                <input
                  type="text"
                  value={demoTitle}
                  onChange={e => setDemoTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. New song idea"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Key (optional)</label>
                  <input
                    type="text"
                    value={demoKey}
                    onChange={e => setDemoKey(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="e.g. Am, C major"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Tempo BPM (optional)</label>
                  <input
                    type="number"
                    value={demoTempo}
                    onChange={e => setDemoTempo(e.target.value)}
                    min={40}
                    max={300}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="e.g. 120"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">MP3 file</label>
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={e => setDemoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-zinc-800 file:text-zinc-300"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Visibility</label>
                <div className="flex flex-wrap gap-2">
                  {(['public', 'private', 'selected_users'] as const).map(v => (
                    <button key={v} type="button" onClick={() => setDemoVisibility(v)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border ${
                        demoVisibility === v ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {v === 'public' ? '🌐 Public' : v === 'private' ? '🔒 Private' : '👥 Shared with selected users'}
                    </button>
                  ))}
                </div>
                {demoVisibility === 'selected_users' && (
                  <input
                    type="text"
                    value={demoShareUsernames}
                    onChange={e => setDemoShareUsernames(e.target.value)}
                    className="mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="Usernames (comma-separated)"
                  />
                )}
              </div>
              {demoError && <p className="text-xs text-red-400">{demoError}</p>}
              <button onClick={handleUploadDemo} disabled={demoUploading || !demoFile}
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white transition-colors">
                {demoUploading ? 'Uploading...' : 'Upload demo'}
              </button>
            </div>
          )}

          {demos.length === 0 && !showAddDemo && (
            <div className="border border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-700 uppercase tracking-widest text-sm">No demos yet.</p>
              {isOwnProfile && <p className="text-xs text-zinc-600 mt-1">Add unfinished songs to share with producers or collaborators.</p>}
            </div>
          )}
          {demos.length > 0 && (
            <div className="flex flex-col gap-3">
              {demos.map(d => {
                if (editingDemoId === d.id && isOwnProfile) {
                  return (
                    <div key={d.id} className="border border-zinc-800 rounded-xl p-5 space-y-4">
                      <p className="text-xs uppercase tracking-widest text-zinc-500">Edit demo</p>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Title</label>
                        <input
                          type="text"
                          value={editDemoTitle}
                          onChange={e => setEditDemoTitle(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                          placeholder="e.g. New song idea"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Key (optional)</label>
                          <input
                            type="text"
                            value={editDemoKey}
                            onChange={e => setEditDemoKey(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                            placeholder="e.g. Am"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Tempo BPM (optional)</label>
                          <input
                            type="number"
                            value={editDemoTempo}
                            onChange={e => setEditDemoTempo(e.target.value)}
                            min={40}
                            max={300}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                            placeholder="120"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Visibility</label>
                        <div className="flex flex-wrap gap-2">
                          {(['public', 'private', 'selected_users'] as const).map(v => (
                            <button key={v} type="button" onClick={() => setEditDemoVisibility(v)}
                              className={`px-3 py-1.5 rounded text-xs font-medium border ${
                                editDemoVisibility === v ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                              }`}>
                              {v === 'public' ? '🌐 Public' : v === 'private' ? '🔒 Private' : '👥 Shared with selected users'}
                            </button>
                          ))}
                        </div>
                        {editDemoVisibility === 'selected_users' && (
                          <input
                            type="text"
                            value={editDemoShareUsernames}
                            onChange={e => setEditDemoShareUsernames(e.target.value)}
                            className="mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                            placeholder="Usernames (comma-separated)"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveEditDemo} disabled={editDemoSaving}
                          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white transition-colors">
                          {editDemoSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingDemoId(null)}
                          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                }
                const { data } = supabase.storage.from('band-logos').getPublicUrl(d.audio_path)
                const publicUrl = data?.publicUrl
                const isDeleteConfirm = deleteDemoId === d.id
                return (
                  <div key={d.id} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser || !publicUrl) return
                        setTrackAndPlay({
                          id: d.id,
                          title: d.title || 'Demo',
                          bandName: displayName,
                          src: publicUrl,
                        })
                      }}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        currentUser
                          ? 'bg-zinc-900 border border-zinc-800 hover:border-red-600'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-600 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <svg
                        className={`w-6 h-6 ${
                          currentUser ? 'text-red-500' : 'text-zinc-600'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{d.title || 'Untitled demo'}</p>
                      <p className="text-xs text-zinc-500">
                        {[
                          new Date(d.created_at).toLocaleDateString(),
                          d.visibility === 'public' ? 'Public' : d.visibility === 'private' ? 'Private' : 'Shared',
                          d.key && `Key: ${d.key}`,
                          d.tempo && `${d.tempo} BPM`,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {isOwnProfile && !editingDemoId && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditDemo(d)}
                          className="p-1.5 rounded border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                        {isDeleteConfirm ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-500 uppercase">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteDemo(d.id)}
                              disabled={deleteDemoLoading}
                              className="px-2 py-1 rounded text-[11px] font-bold uppercase bg-red-900/60 text-red-400 hover:bg-red-800/60 border border-red-800"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteDemoId(null)}
                              className="px-2 py-1 rounded text-[11px] font-bold uppercase border border-zinc-700 text-zinc-400 hover:text-white"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteDemoId(d.id)}
                            className="p-1.5 rounded border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                    <span className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-500 uppercase tracking-widest shrink-0">MP3</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Bands ──────────────────────────────────────────────── */}
        <div className="mt-10">
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
                  <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {r.cover_url
                      ? <img src={r.cover_url} alt={r.release_title} className="w-full h-full object-contain" />
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
