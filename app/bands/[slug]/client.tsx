'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const GlobalNav = dynamic(() => import('../../../components/GlobalNav').then(mod => mod.default), { ssr: false })

type Band = {
  id: string
  name: string
  slug: string
  user_id: string
  country: string | null
  year_formed: number | null
  description: string | null
  genre_ids: number[] | null
  logo_url: string | null
  band_pic_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  youtube_url: string | null
  bandcamp_url: string | null
  soundcloud_url: string | null
}

type Release = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  description: string | null
  tracks: Track[]
  avgRating: number | null
  ratingCount: number
  userRating: number | null
}

type Track = {
  id: string
  title: string
  track_number: number
  embed_url: string
  duration: string | null
  lyrics_by: string | null
  music_by: string | null
}

type Influence = { id: number; name: string }
type Genre = { id: number; name: string }
type Member = {
  id: string
  name: string
  instrument: string
  join_year: number | null
  country: string | null
  profile_id: string | null
  profiles: { username: string; is_producer: boolean; is_sound_engineer: boolean } | null
}

type Review = {
  id: string
  title: string
  content: string
  rating: number | null
  created_at: string
  user_id: string
  profiles: { username: string }
}

type Show = {
  id: string
  date: string
  city: string
  country: string | null
  venue: string | null
  ticket_url: string | null
}

type SimilarBand = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  country: string | null
  genre_ids: number[] | null
}

function parseShowDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function countryToFlag(country: string): string {
  const flags: Record<string, string> = {
    'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Argentina': '🇦🇷',
    'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Bolivia': '🇧🇴',
    'Brazil': '🇧🇷', 'Bulgaria': '🇧🇬', 'Canada': '🇨🇦', 'Chile': '🇨🇱',
    'China': '🇨🇳', 'Colombia': '🇨🇴', 'Croatia': '🇭🇷', 'Czech Republic': '🇨🇿',
    'Denmark': '🇩🇰', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'Estonia': '🇪🇪',
    'Finland': '🇫🇮', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Greece': '🇬🇷',
    'Hungary': '🇭🇺', 'Iceland': '🇮🇸', 'India': '🇮🇳', 'Indonesia': '🇮🇩',
    'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Ireland': '🇮🇪', 'Israel': '🇮🇱',
    'Italy': '🇮🇹', 'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Latvia': '🇱🇻',
    'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺', 'Malaysia': '🇲🇾', 'Mexico': '🇲🇽',
    'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴', 'Pakistan': '🇵🇰',
    'Peru': '🇵🇪', 'Philippines': '🇵🇭', 'Poland': '🇵🇱', 'Portugal': '🇵🇹',
    'Romania': '🇷🇴', 'Russia': '🇷🇺', 'Saudi Arabia': '🇸🇦', 'Serbia': '🇷🇸',
    'Singapore': '🇸🇬', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'South Africa': '🇿🇦',
    'South Korea': '🇰🇷', 'Spain': '🇪🇸', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭',
    'Thailand': '🇹🇭', 'Turkey': '🇹🇷', 'Ukraine': '🇺🇦', 'United Kingdom': '🇬🇧',
    'United States': '🇺🇸', 'Uruguay': '🇺🇾', 'Venezuela': '🇻🇪', 'Vietnam': '🇻🇳'
  }
  return flags[country] || '🌍'
}

function primaryInstrumentEmoji(instrument: string): string {
  const primary = instrument.split(',')[0].trim()
  const map: Record<string, string> = {
    'Vocals': '🎤', 'Guitar': '🎸', 'Bass': '🎸', 'Drums': '🥁', 'Keyboards': '🎹',
    'Violin': '🎻', 'Cello': '🎻', 'Trumpet': '🎺', 'Saxophone': '🎷',
    'Flute': '🪈', 'DJ / Turntables': '🎧',
  }
  return map[primary] || '🎵'
}

function getEmbedUrl(url: string): { type: 'youtube' | 'soundcloud' | 'unknown', url: string } {
  if (url.includes('youtube.com/embed/')) return { type: 'youtube', url }
  if (url.includes('youtube.com/watch')) {
    const match = url.match(/v=([a-zA-Z0-9_-]+)/)
    if (match) return { type: 'youtube', url: `https://www.youtube.com/embed/${match[1]}` }
  }
  if (url.includes('youtu.be')) {
    const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (match) return { type: 'youtube', url: `https://www.youtube.com/embed/${match[1]}` }
  }
  if (url.includes('soundcloud.com')) return { type: 'soundcloud', url }
  return { type: 'unknown', url }
}

function RatingDisplay({ avg, count }: { avg: number | null, count: number }) {
  if (avg === null || count === 0) return (
    <span className="text-xs text-zinc-600 uppercase tracking-widest">No ratings yet</span>
  )
  const color = avg >= 15 ? 'text-green-400' : avg >= 10 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-2xl font-black ${color}`}>{avg.toFixed(1)}</span>
      <span className="text-zinc-600 text-sm">/20</span>
      <span className="text-zinc-600 text-xs">({count} rating{count !== 1 ? 's' : ''})</span>
    </div>
  )
}

function RatingInput({ releaseId, userId, initialRating, onRated }: {
  releaseId: string
  userId: string
  initialRating: number | null
  onRated: (releaseId: string, score: number) => void
}) {
  const [value, setValue] = useState(initialRating?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async () => {
    setError('')
    const score = parseFloat(value)
    if (isNaN(score) || score < 0 || score > 20) { setError('Enter a number between 0 and 20'); return }
    if (Math.round(score * 10) / 10 !== score) { setError('Max one decimal place (e.g. 13.5)'); return }
    setSaving(true)

    const { data: existing } = await supabase
      .from('ratings').select('id').eq('release_id', releaseId).eq('user_id', userId).single()

    if (existing) {
      await supabase.from('ratings').update({ score }).eq('id', existing.id)
    } else {
      await supabase.from('ratings').insert({ release_id: releaseId, user_id: userId, score })
    }

    onRated(releaseId, score)
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 uppercase tracking-widest">
        {initialRating !== null ? 'Your rating' : 'Rate this release'}
      </p>
      <div className="flex items-center gap-2">
        <input type="number" value={value} onChange={e => setValue(e.target.value)}
          min="0" max="20" step="0.1"
          className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
          placeholder="0–20" />
        <span className="text-zinc-600 text-sm">/20</span>
        <button onClick={handleSubmit} disabled={saving}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
          {saving ? '...' : initialRating !== null ? 'Update' : 'Submit'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

const INSTRUMENTS = [
  { name: 'Vocals', emoji: '🎤' },
  { name: 'Guitar', emoji: '🎸' },
  { name: 'Bass', emoji: '🎸' },
  { name: 'Drums', emoji: '🥁' },
  { name: 'Keyboards', emoji: '🎹' },
  { name: 'Violin', emoji: '🎻' },
  { name: 'Cello', emoji: '🎻' },
  { name: 'Trumpet', emoji: '🎺' },
  { name: 'Saxophone', emoji: '🎷' },
  { name: 'Flute', emoji: '🪈' },
  { name: 'DJ / Turntables', emoji: '🎧' },
]

export default function BandPageClient({ slug }: { slug: string }) {
  const [band, setBand] = useState<Band | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [influences, setInfluences] = useState<Influence[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [followCount, setFollowCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [activeTrack, setActiveTrack] = useState<{ releaseId: string, trackId: string } | null>(null)
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const supabase = createClient()
  const [shows, setShows] = useState<Show[]>([])
  const [similarBands, setSimilarBands] = useState<SimilarBand[]>([])
  const [reviews, setReviews] = useState<Record<string, Review[]>>({})
  const [reviewTitle, setReviewTitle] = useState<Record<string, string>>({})
  const [reviewContent, setReviewContent] = useState<Record<string, string>>({})
  const [reviewRating, setReviewRating] = useState<Record<string, string>>({})
  const [submittingReview, setSubmittingReview] = useState<string | null>(null)
  const [showReviewForm, setShowReviewForm] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<Record<string, string>>({})
  // Join request
  const [userMemberStatus, setUserMemberStatus] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joinInstruments, setJoinInstruments] = useState<string[]>([])
  const [submittingJoin, setSubmittingJoin] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user.id)

      const { data: bandData } = await supabase
        .from('bands').select('*').eq('slug', slug).eq('is_published', true).single()
      if (!bandData) { setNotFound(true); return }
      setBand(bandData)

      // Releases with tracks and ratings
      const { data: releaseData } = await supabase
        .from('releases').select('*').eq('band_id', bandData.id).order('release_year', { ascending: false })

      if (releaseData) {
        const releasesWithData = await Promise.all(
          releaseData.map(async (release) => {
            const { data: tracks } = await supabase
              .from('tracks').select('*').eq('release_id', release.id).order('track_number')
            const { data: ratings } = await supabase
              .from('ratings').select('score, user_id').eq('release_id', release.id)
            const ratingCount = ratings?.length || 0
            const avgRating = ratingCount > 0
              ? ratings!.reduce((sum, r) => sum + r.score, 0) / ratingCount : null
            const userRating = user
              ? ratings?.find(r => r.user_id === user.id)?.score ?? null : null
            return { ...release, tracks: tracks || [], avgRating, ratingCount, userRating }
          })
        )
        setReleases(releasesWithData)
        // Nothing auto-expanded — user opens releases manually
      }

      // Influences
      const { data: infData } = await supabase
        .from('band_influences').select('influence_id, influences_list(id, name)').eq('band_id', bandData.id)
      if (infData) setInfluences(infData.map((i: any) => i.influences_list).filter(Boolean))

      // Genres
      if (bandData.genre_ids && bandData.genre_ids.length > 0) {
        const { data: genreData } = await supabase
          .from('genres_list').select('id, name').in('id', bandData.genre_ids)
        if (genreData) setGenres(genreData)
      }

      // Members — approved only for public display
      const { data: memberData } = await supabase
        .from('band_members').select('*, profiles(username, is_producer, is_sound_engineer)')
        .eq('band_id', bandData.id)
        .eq('status', 'approved')
        .order('display_order')
      if (memberData) setMembers(memberData as any)

      // Upcoming shows (next 5)
      const today = new Date().toISOString().split('T')[0]
      const { data: showData } = await supabase
        .from('shows')
        .select('id, date, city, country, venue, ticket_url')
        .eq('band_id', bandData.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(5)
      if (showData) setShows(showData)

      // Similar bands (shared genres)
      if (bandData.genre_ids && bandData.genre_ids.length > 0) {
        const { data: simData } = await supabase
          .from('bands')
          .select('id, name, slug, logo_url, country, genre_ids')
          .eq('is_published', true)
          .neq('id', bandData.id)
          .overlaps('genre_ids', bandData.genre_ids)
          .limit(5)
        if (simData) setSimilarBands(simData)
      }

      // Follow count
      const { count } = await supabase
        .from('follows').select('*', { count: 'exact', head: true }).eq('band_id', bandData.id)
      setFollowCount(count || 0)

      if (user) {
        const { data: followData } = await supabase
          .from('follows').select('id').eq('band_id', bandData.id).eq('user_id', user.id).single()
        setIsFollowing(!!followData)

        // Current user's membership status for this band
        const [{ data: myRecord }, { data: myProfile }] = await Promise.all([
          supabase.from('band_members')
            .select('status, role')
            .eq('band_id', bandData.id)
            .eq('profile_id', user.id)
            .maybeSingle(),
          supabase.from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single(),
        ])
        if (myRecord?.role === 'leader') setUserMemberStatus('leader')
        else if (myRecord) setUserMemberStatus(myRecord.status)
        else setUserMemberStatus('none')

        if (myProfile) {
          const full = [myProfile.first_name, myProfile.last_name].filter(Boolean).join(' ')
          if (full) setJoinName(full)
        }
      }
    }
    load()
  }, [slug])

  const handleFollow = async () => {
    if (!currentUser || !band) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('band_id', band.id).eq('user_id', currentUser)
      setIsFollowing(false)
      setFollowCount(prev => prev - 1)
    } else {
      await supabase.from('follows').insert({ band_id: band.id, user_id: currentUser })
      setIsFollowing(true)
      setFollowCount(prev => prev + 1)
    }
    setFollowLoading(false)
  }

  const handleRated = (releaseId: string, score: number) => {
    setReleases(prev => prev.map(r => {
      if (r.id !== releaseId) return r
      const wasRated = r.userRating !== null
      const newCount = wasRated ? r.ratingCount : r.ratingCount + 1
      const newAvg = wasRated
        ? ((r.avgRating! * r.ratingCount) - r.userRating! + score) / r.ratingCount
        : ((r.avgRating || 0) * r.ratingCount + score) / newCount
      return { ...r, userRating: score, avgRating: newAvg, ratingCount: newCount }
    }))
  }

  const loadReviews = async (releaseId: string) => {
    const { data } = await supabase
      .from('reviews')
      .select('id, title, content, rating, created_at, user_id, profiles(username)')
      .eq('release_id', releaseId)
      .order('created_at', { ascending: false })
    setReviews(prev => ({ ...prev, [releaseId]: (data as any) || [] }))
  }

  const handleSubmitReview = async (releaseId: string) => {
    if (!currentUser) return
    const title = reviewTitle[releaseId]?.trim()
    const content = reviewContent[releaseId]?.trim()
    if (!title || !content) return

    const ratingStr = reviewRating[releaseId]?.trim()
    let parsedRating: number | null = null
    if (ratingStr) {
      parsedRating = parseFloat(ratingStr)
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 20) {
        setReviewError(prev => ({ ...prev, [releaseId]: 'Rating must be between 0 and 20.' }))
        return
      }
      parsedRating = Math.round(parsedRating * 10) / 10
    }

    setSubmittingReview(releaseId)
    setReviewError(prev => ({ ...prev, [releaseId]: '' }))

    const existing = (reviews[releaseId] || []).find(r => r.user_id === currentUser)
    if (existing) {
      const { data, error } = await supabase.from('reviews')
        .update({ title, content, rating: parsedRating })
        .eq('id', existing.id)
        .select('id, title, content, rating, created_at, user_id, profiles(username)')
        .single()
      if (error) {
        setReviewError(prev => ({ ...prev, [releaseId]: error.message }))
        setSubmittingReview(null)
        return
      }
      if (data) setReviews(prev => ({
        ...prev,
        [releaseId]: prev[releaseId].map(r => r.id === existing.id ? data as any : r)
      }))
    } else {
      const { data, error } = await supabase.from('reviews')
        .insert({ release_id: releaseId, user_id: currentUser, title, content, rating: parsedRating })
        .select('id, title, content, rating, created_at, user_id, profiles(username)')
        .single()
      if (error) {
        setReviewError(prev => ({ ...prev, [releaseId]: error.message }))
        setSubmittingReview(null)
        return
      }
      if (data) setReviews(prev => ({
        ...prev,
        [releaseId]: [data as any, ...(prev[releaseId] || [])]
      }))
    }
    setShowReviewForm(null)
    setSubmittingReview(null)
  }

  const handleDeleteReview = async (releaseId: string, reviewId: string) => {
    await supabase.from('reviews').delete().eq('id', reviewId)
    setReviews(prev => ({
      ...prev,
      [releaseId]: prev[releaseId].filter(r => r.id !== reviewId)
    }))
  }

  const toggleJoinInstrument = (name: string) =>
    setJoinInstruments(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])

  const handleJoinRequest = async () => {
    if (!currentUser || !band || !joinName.trim() || joinInstruments.length === 0) return
    setSubmittingJoin(true)
    setJoinError(null)
    const { error } = await supabase.from('band_members').insert({
      band_id: band.id,
      profile_id: currentUser,
      name: joinName.trim(),
      instrument: joinInstruments.join(', '),
      role: 'member',
      status: 'pending',
      display_order: 999,
    })
    if (error) {
      setJoinError('Could not send request. ' + error.message)
      setSubmittingJoin(false)
      return
    }
    // Notify the band leader
    try {
      await supabase.from('notifications').insert({
        user_id: band.user_id,
        title: `New join request for ${band.name}`,
        body: `${joinName.trim()} wants to join as ${joinInstruments.join(', ')}.`,
        href: `/dashboard/manage/${band.id}`,
      })
    } catch (_) {}
    setUserMemberStatus('pending')
    setShowJoinForm(false)
    setSubmittingJoin(false)
  }

  if (notFound) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <p className="text-zinc-500 text-xl mb-4">Band not found.</p>
      <Link href="/explore" className="text-red-500 hover:text-red-400">← Back to explore</Link>
    </main>
  )

  if (!band) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-600 animate-pulse">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Back to bands" currentUser={currentUser} />

      {/* Hero */}
      <div className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-start gap-8">
            {/* Logo */}
            <div className="w-36 h-36 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
              {band.logo_url
                ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                : <span className="text-5xl">🤘</span>
              }
            </div>

            {/* Info */}
            <div className="flex-1">
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {genres.map(g => (
                    <Link key={g.id} href={`/explore?genre=${g.id}`}
                      className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-500 uppercase tracking-wider hover:border-red-500 hover:text-white transition-colors">
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}
              <h1 className="text-5xl font-black uppercase tracking-tight mb-3">{band.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-500 mb-5">
                {band.country && <span>{countryToFlag(band.country)} {band.country}</span>}
                {band.year_formed && <span>📅 Est. {band.year_formed}</span>}
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-8 mb-5">
                <div>
                  <p className="text-2xl font-black text-white">{followCount}</p>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest">Followers</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{releases.length}</p>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest">Releases</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">
                    {releases.reduce((sum, r) => sum + r.tracks.length, 0)}
                  </p>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest">Tracks</p>
                </div>
              </div>

              {/* Follow + join + socials */}
              <div className="flex items-center gap-3 flex-wrap">
                {currentUser ? (
                  <button onClick={handleFollow} disabled={followLoading}
                    className={`px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-sm transition-colors ${
                      isFollowing
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}>
                    {followLoading ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                ) : (
                  <Link href="/login" className="px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-sm bg-red-600 text-white hover:bg-red-700 transition-colors">
                    + Follow
                  </Link>
                )}

                {/* Join request button / status badge */}
                {currentUser && userMemberStatus === 'none' && (
                  <button
                    onClick={() => setShowJoinForm(v => !v)}
                    className="px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-sm border border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-white transition-colors">
                    {showJoinForm ? 'Cancel' : 'Request to Join'}
                  </button>
                )}
                {currentUser && userMemberStatus === 'pending' && (
                  <span className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-amber-800/60 text-amber-600">
                    Request Pending
                  </span>
                )}
                {currentUser && userMemberStatus === 'approved' && (
                  <span className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-green-800/60 text-green-600">
                    ✓ Member
                  </span>
                )}
                {currentUser && userMemberStatus === 'leader' && (
                  <Link href={`/dashboard/manage/${band.id}`}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white transition-colors flex items-center gap-1.5">
                    👑 Manage Band
                  </Link>
                )}
                {currentUser && userMemberStatus === 'rejected' && (
                  <span className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-800 text-zinc-600">
                    Request Declined
                  </span>
                )}
                {(band.instagram_url || band.facebook_url || band.youtube_url || band.bandcamp_url || band.soundcloud_url) && (
                  <div className="flex items-center gap-2">
                    {band.instagram_url && (
                      <a href={band.instagram_url} target="_blank" rel="noopener noreferrer"
                        title="Instagram"
                        className="w-9 h-9 rounded-lg border border-zinc-700 hover:border-red-500 flex items-center justify-center transition-colors group">
                        <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </a>
                    )}
                    {band.facebook_url && (
                      <a href={band.facebook_url} target="_blank" rel="noopener noreferrer"
                        title="Facebook"
                        className="w-9 h-9 rounded-lg border border-zinc-700 hover:border-red-500 flex items-center justify-center transition-colors group">
                        <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                    {band.youtube_url && (
                      <a href={band.youtube_url} target="_blank" rel="noopener noreferrer"
                        title="YouTube"
                        className="w-9 h-9 rounded-lg border border-zinc-700 hover:border-red-500 flex items-center justify-center transition-colors group">
                        <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                    {band.bandcamp_url && (
                      <a href={band.bandcamp_url} target="_blank" rel="noopener noreferrer"
                        title="Bandcamp"
                        className="w-9 h-9 rounded-lg border border-zinc-700 hover:border-red-500 flex items-center justify-center transition-colors group">
                        <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M0 18.75l7.437-13.5H24l-7.438 13.5z"/>
                        </svg>
                      </a>
                    )}
                    {band.soundcloud_url && (
                      <a href={band.soundcloud_url} target="_blank" rel="noopener noreferrer"
                        title="SoundCloud"
                        className="w-9 h-9 rounded-lg border border-zinc-700 hover:border-red-500 flex items-center justify-center transition-colors group">
                        <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M1.175 12.225c-.15 0-.271.119-.29.281l-.24 2.236.24 2.219c.019.163.14.281.29.281.149 0 .27-.118.289-.281l.272-2.219-.272-2.236c-.019-.162-.14-.281-.289-.281zm1.565-.899c-.169 0-.307.13-.325.298l-.24 3.135.24 3.06c.018.168.156.297.325.297.17 0 .307-.129.326-.297l.272-3.06-.272-3.135c-.019-.168-.156-.298-.326-.298zm1.565-.899c-.189 0-.344.146-.362.334l-.218 4.034.218 3.922c.018.188.173.334.362.334.19 0 .345-.146.363-.334l.247-3.922-.247-4.034c-.018-.188-.173-.334-.363-.334zm1.6.337c-.209 0-.381.163-.399.372l-.197 3.697.197 3.828c.018.209.19.372.399.372.21 0 .381-.163.4-.372l.222-3.828-.222-3.697c-.019-.209-.19-.372-.4-.372zm1.566-.225c-.229 0-.418.18-.436.409l-.176 3.922.176 3.75c.018.229.207.409.436.409.23 0 .419-.18.437-.409l.2-3.75-.2-3.922c-.018-.229-.207-.409-.437-.409zm9.6-3.407c-.337 0-.658.063-.956.177C15.847 4.01 14.076 2.25 11.869 2.25c-.553 0-1.09.106-1.58.3-.181.07-.229.14-.231.207v14.806c.002.071.055.131.126.143h10.723c.622 0 1.125-.497 1.125-1.11C22.032 9.963 18.513 7.357 15.071 7.132z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Band pic */}
            {band.band_pic_url && (
              <div className="relative hidden md:block shrink-0 rounded-xl overflow-hidden"
                style={{ width: '420px', height: '260px' }}>
                <img src={band.band_pic_url} alt={`${band.name} promo`}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, transparent 40%, black 100%)' }} />
              </div>
            )}
          </div>

          {/* Join request form — full width below hero row */}
          {showJoinForm && currentUser && userMemberStatus === 'none' && (
            <div className="mt-6 border border-zinc-800 rounded-xl p-6 flex flex-col gap-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Request to Join {band.name}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-600 mb-2 block">
                    Your name in this band
                  </label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-600 mb-2 block">
                    Your instrument(s)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INSTRUMENTS.map(inst => (
                      <button
                        key={inst.name}
                        type="button"
                        onClick={() => toggleJoinInstrument(inst.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          joinInstruments.includes(inst.name)
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}>
                        <span>{inst.emoji}</span>
                        <span>{inst.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleJoinRequest}
                  disabled={submittingJoin || !joinName.trim() || joinInstruments.length === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg text-xs transition-colors">
                  {submittingJoin ? 'Sending...' : 'Send Request'}
                </button>
                {joinError && <p className="text-red-400 text-xs">{joinError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-12">

        {/* Left — bio + releases */}
        <div className="md:col-span-2 flex flex-col gap-8">
          {band.description && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">About</h2>
              <p className="text-zinc-300 leading-relaxed">{band.description}</p>
            </section>
          )}

          <section>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
              Releases ({releases.length})
            </h2>
            {releases.length === 0 ? (
              <div className="border border-zinc-800 rounded-xl p-8 text-center text-zinc-600">
                <p className="text-3xl mb-3">🎵</p>
                <p className="text-sm uppercase tracking-widest">No releases yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {releases.map(release => (
                  <div key={release.id} className="border border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => {
                        const isOpening = expandedRelease !== release.id
                        setExpandedRelease(isOpening ? release.id : null)
                        if (isOpening) {
                          if (!reviews[release.id]) loadReviews(release.id)
                        }
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-zinc-950 transition-colors text-left">
                      <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        {release.cover_url
                          ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>
                        }
                      </div>
                      <div className="flex-1">
                        <Link href={`/releases/${release.id}`}
                          onClick={e => e.stopPropagation()}
                          className="font-black uppercase tracking-wide hover:text-red-400 transition-colors block">
                          {release.title}
                        </Link>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {release.release_type}
                          {release.release_year ? ` · ${release.release_year}` : ''}
                          {' · '}{release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                        </p>
                        <div className="mt-1">
                          <RatingDisplay avg={release.avgRating} count={release.ratingCount} />
                        </div>
                      </div>
                      <span className={`text-zinc-600 text-xl transition-transform duration-200 ${expandedRelease === release.id ? 'rotate-90' : ''}`}>›</span>
                    </button>

                    {expandedRelease === release.id && (
                      <div className="border-t border-zinc-800">
                        {release.description && (
                          <p className="px-4 py-3 text-sm text-zinc-500 border-b border-zinc-800">
                            {release.description}
                          </p>
                        )}
                        {release.tracks.map(track => {
                          const isActive = activeTrack?.trackId === track.id
                          const embed = getEmbedUrl(track.embed_url)
                          return (
                            <div key={track.id} className="border-b border-zinc-800 last:border-0">
                              <button
                                onClick={() => setActiveTrack(isActive ? null : { releaseId: release.id, trackId: track.id })}
                                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-950 transition-colors text-left">
                                <span className="text-xs text-zinc-600 w-5 text-center">
                                  {isActive ? '▶' : track.track_number}
                                </span>
                                <div className="flex-1">
                                  <span className={`text-sm ${isActive ? 'text-red-400' : 'text-zinc-300'}`}>
                                    {track.title}
                                  </span>
                                  {(track.duration || track.lyrics_by || track.music_by) && (
                                    <div className="flex flex-wrap gap-3 text-xs text-zinc-600 mt-0.5">
                                      {track.duration && <span>⏱ {track.duration}</span>}
                                      {track.lyrics_by && <span>✍️ <strong className="text-zinc-500">Lyrics:</strong> {track.lyrics_by}</span>}
                                      {track.music_by && <span>🎸 <strong className="text-zinc-500">Music:</strong> {track.music_by}</span>}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-zinc-600">
                                  {embed.type === 'youtube' ? 'YT' : embed.type === 'soundcloud' ? 'SC' : ''}
                                </span>
                              </button>
                              {isActive && (
                                <div className="px-4 pb-4">
                                  {embed.type === 'youtube' && (
                                    <iframe src={embed.url} className="w-full rounded-lg" style={{ height: '200px' }}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen />
                                  )}
                                  {embed.type === 'soundcloud' && (
                                    <iframe
                                      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(embed.url)}&color=%23ff0000&auto_play=true&hide_related=true&show_comments=false&show_user=false`}
                                      className="w-full rounded-lg" style={{ height: '120px' }} allow="autoplay" />
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Rating */}
                        <div className="px-4 py-4 border-t border-zinc-800 bg-zinc-950/50">
                          {currentUser ? (
                            <RatingInput
                              releaseId={release.id}
                              userId={currentUser}
                              initialRating={release.userRating}
                              onRated={handleRated}
                            />
                          ) : (
                            <p className="text-xs text-zinc-600">
                              <Link href="/login" className="text-red-500 hover:text-red-400">Login</Link> to rate this release
                            </p>
                          )}
                        </div>
                        {/* Reviews */}
                        <div className="border-t border-zinc-800 px-4 py-4">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs uppercase tracking-widest text-zinc-500">
                              Reviews ({(reviews[release.id] || []).length})
                            </p>
                            {currentUser && showReviewForm !== release.id && (
                              <button
                                onClick={() => {
                                  const existing = (reviews[release.id] || []).find(r => r.user_id === currentUser)
                                  if (existing) {
                                    setReviewTitle(prev => ({ ...prev, [release.id]: existing.title }))
                                    setReviewContent(prev => ({ ...prev, [release.id]: existing.content }))
                                    setReviewRating(prev => ({ ...prev, [release.id]: existing.rating?.toString() || '' }))
                                  }
                                  setShowReviewForm(release.id)
                                }}
                                className="text-xs border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-white px-3 py-1 rounded-lg transition-colors">
                                {(reviews[release.id] || []).find(r => r.user_id === currentUser)
                                  ? 'Edit your review' : '+ Write a review'}
                              </button>
                            )}
                          </div>

                          {/* Review form */}
                          {showReviewForm === release.id && (
                            <div className="border border-zinc-800 rounded-xl p-4 mb-5 flex flex-col gap-3">
                              <input
                                type="text"
                                value={reviewTitle[release.id] || ''}
                                onChange={e => setReviewTitle(prev => ({ ...prev, [release.id]: e.target.value }))}
                                placeholder="Review title"
                                maxLength={120}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                              />
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={reviewRating[release.id] || ''}
                                    onChange={e => setReviewRating(prev => ({ ...prev, [release.id]: e.target.value }))}
                                    min="0" max="20" step="0.1"
                                    placeholder="Rating"
                                    className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                                  />
                                  <span className="text-zinc-600 text-sm">/20</span>
                                </div>
                                <span className="text-xs text-zinc-700">(optional)</span>
                              </div>
                              <textarea
                                value={reviewContent[release.id] || ''}
                                onChange={e => setReviewContent(prev => ({ ...prev, [release.id]: e.target.value }))}
                                placeholder="Share your thoughts on this release..."
                                maxLength={2000}
                                rows={4}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors resize-y"
                              />
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleSubmitReview(release.id)}
                                  disabled={
                                    submittingReview === release.id ||
                                    !reviewTitle[release.id]?.trim() ||
                                    !reviewContent[release.id]?.trim()
                                  }
                                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
                                  {submittingReview === release.id ? '...'
                                    : (reviews[release.id] || []).find(r => r.user_id === currentUser)
                                      ? 'Update Review' : 'Publish Review'}
                                </button>
                                <button onClick={() => setShowReviewForm(null)}
                                  className="text-xs text-zinc-600 hover:text-white transition-colors">
                                  Cancel
                                </button>
                                <span className="text-xs text-zinc-700 ml-auto">
                                  {(reviewContent[release.id] || '').length}/2000
                                </span>
                              </div>
                              {reviewError[release.id] && (
                                <p className="text-red-400 text-xs mt-1">{reviewError[release.id]}</p>
                              )}
                            </div>
                          )}

                          {/* Review list */}
                          {(reviews[release.id] === undefined) ? (
                            <p className="text-xs text-zinc-700 animate-pulse">Loading reviews...</p>
                          ) : (reviews[release.id] || []).length === 0 ? (
                            <p className="text-xs text-zinc-700">No reviews yet. Be the first!</p>
                          ) : (
                            <div className="flex flex-col divide-y divide-zinc-800/50">
                              {(reviews[release.id] || []).map(review => (
                                <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-white">{review.title}</p>
                                        {review.rating !== null && (
                                          <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${
                                            review.rating >= 15 ? 'text-green-400 bg-green-950/40 border-green-900/50'
                                            : review.rating >= 10 ? 'text-yellow-400 bg-yellow-950/40 border-yellow-900/50'
                                            : 'text-red-400 bg-red-950/40 border-red-900/50'
                                          }`}>
                                            {review.rating.toFixed(1)}/20
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-bold text-zinc-400">
                                          {review.profiles?.username}
                                        </span>
                                        <span className="text-xs text-zinc-700">
                                          {new Date(review.created_at).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                    {review.user_id === currentUser && (
                                      <div className="flex gap-3 shrink-0">
                                        <button
                                          onClick={() => {
                                            setReviewTitle(prev => ({ ...prev, [release.id]: review.title }))
                                            setReviewContent(prev => ({ ...prev, [release.id]: review.content }))
                                            setReviewRating(prev => ({ ...prev, [release.id]: review.rating?.toString() || '' }))
                                            setShowReviewForm(release.id)
                                          }}
                                          className="text-xs text-zinc-600 hover:text-white transition-colors">
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteReview(release.id, review.id)}
                                          className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed whitespace-pre-line line-clamp-4">
                                    {review.content}
                                  </p>
                                  <Link href={`/reviews/${review.id}`}
                                    className="text-xs text-red-500 hover:text-red-400 transition-colors mt-2 inline-block">
                                    Read full review →
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}

                          {!currentUser && (
                            <p className="text-xs text-zinc-600 mt-3">
                              <Link href="/login" className="text-red-500 hover:text-red-400">Login</Link> to write a review
                            </p>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-8">
          {members.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Band Members</h2>
              <div className="flex flex-col gap-1">
                {members.map(member => {
                  const profileHref = member.profiles?.username ? `/members/${member.profiles.username}` : null
                  const cardContent = (
                    <>
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm shrink-0">
                        {primaryInstrumentEmoji(member.instrument)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-bold ${profileHref ? 'group-hover:text-red-400 transition-colors' : ''}`}>
                            {member.name}
                          </span>
                          {member.profiles?.is_producer && (
                            <span className="text-xs px-1.5 py-0.5 rounded border border-red-900/50 bg-red-950/30 text-red-400 uppercase tracking-widest font-medium">
                              Producer
                            </span>
                          )}
                          {member.profiles?.is_sound_engineer && (
                            <span className="text-xs px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 uppercase tracking-widest font-medium">
                              Engineer
                            </span>
                          )}
                          {member.country && (
                            <span className="text-sm shrink-0" title={member.country}>
                              {countryToFlag(member.country)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {member.instrument}
                          {member.join_year && <span className="text-zinc-700"> · since {member.join_year}</span>}
                        </p>
                      </div>
                      {profileHref && (
                        <span className="text-zinc-700 group-hover:text-red-500 transition-colors text-xs shrink-0">→</span>
                      )}
                    </>
                  )
                  return profileHref ? (
                    <Link key={member.id} href={profileHref}
                      className="flex items-center gap-3 group rounded-lg -mx-2 px-2 py-2 hover:bg-zinc-900/60 transition-colors">
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={member.id} className="flex items-center gap-3 px-2 py-2">
                      {cardContent}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {shows.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-widest text-zinc-500">Upcoming Shows</h2>
                <Link href="/shows" className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
                  All shows →
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {shows.map(show => {
                  const d = parseShowDate(show.date)
                  const day = String(d.getDate()).padStart(2, '0')
                  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
                  return (
                    <div key={show.id} className="flex items-center gap-3 border border-zinc-800 rounded-xl px-3 py-2.5">
                      <div className="text-center shrink-0 w-10">
                        <p className="text-sm font-black leading-none">{day}</p>
                        <p className="text-xs text-red-500 font-bold uppercase">{month}</p>
                      </div>
                      <div className="w-px h-7 bg-zinc-800 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {show.city}{show.country ? `, ${show.country}` : ''}
                        </p>
                        {show.venue && <p className="text-xs text-zinc-600 truncate">{show.venue}</p>}
                      </div>
                      {show.ticket_url && (
                        <a href={show.ticket_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-red-500 px-2 py-1 rounded transition-colors shrink-0">
                          Tickets
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {influences.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Influences</h2>
              <div className="flex flex-wrap gap-2">
                {influences.map(inf => (
                  <Link key={inf.id} href={`/explore?influence=${inf.id}`}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:border-red-500 hover:text-white transition-colors">
                    {inf.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {similarBands.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Similar Bands</h2>
              <div className="flex flex-col gap-1">
                {similarBands.map(sim => {
                  const simGenreNames = sim.genre_ids
                    ? genres.filter(g => sim.genre_ids!.includes(g.id)).map(g => g.name)
                    : []
                  return (
                    <Link key={sim.id} href={`/bands/${sim.slug}`}
                      className="flex items-center gap-3 group rounded-lg -mx-2 px-2 py-2 hover:bg-zinc-900/60 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {sim.logo_url
                          ? <img src={sim.logo_url} alt={sim.name} className="w-full h-full object-cover" />
                          : <span className="text-sm">🤘</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold group-hover:text-red-400 transition-colors truncate">
                          {sim.name}
                        </p>
                        {simGenreNames.length > 0 && (
                          <p className="text-xs text-zinc-600 truncate">{simGenreNames.slice(0, 2).join(', ')}</p>
                        )}
                      </div>
                      <span className="text-zinc-700 group-hover:text-red-500 transition-colors text-xs shrink-0">→</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
