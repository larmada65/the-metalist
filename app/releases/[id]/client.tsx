'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'
import { useAudioPlayer } from '../../../components/AudioPlayerProvider'

type Band = {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

type Track = {
  id: string
  title: string
  track_number: number
  embed_url: string
  audio_path: string | null
  duration: string | null
  lyrics_by: string | null
  music_by: string | null
  lyrics: string | null
}

type Release = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  description: string | null
  band_id: string
  bands: Band
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

type RelatedRelease = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
}

function getEmbedUrl(url: string): { type: 'youtube' | 'soundcloud' | 'unknown'; url: string } {
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

function VUMeter({ value }: { value: number }) {
  const pct = (value / 20) * 100
  const colorClass = value >= 15
    ? 'from-green-600 to-green-400'
    : value >= 10 ? 'from-yellow-600 to-yellow-400' : 'from-red-700 to-red-500'
  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ratingColor(r: number) {
  if (r >= 15) return 'text-green-400 border-green-900/50 bg-green-950/40'
  if (r >= 10) return 'text-yellow-400 border-yellow-900/50 bg-yellow-950/40'
  return 'text-red-400 border-red-900/50 bg-red-950/40'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ReleaseClient({ releaseId }: { releaseId: string }) {
  const [release, setRelease] = useState<Release | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTrack, setActiveTrack] = useState<string | null>(null)
  const [relatedReleases, setRelatedReleases] = useState<RelatedRelease[]>([])
  const [lyricsTrack, setLyricsTrack] = useState<Track | null>(null)
  const [coverZoomOpen, setCoverZoomOpen] = useState(false)
  const [canEditRelease, setCanEditRelease] = useState(false)
  const { setTrackAndPlay, currentTrack } = useAudioPlayer()

  // Rating input
  const [ratingValue, setRatingValue] = useState('')
  const [savingRating, setSavingRating] = useState(false)
  const [ratingError, setRatingError] = useState('')

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewContent, setReviewContent] = useState('')
  const [reviewRating, setReviewRating] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user.id)

      const { data: releaseData } = await supabase
        .from('releases')
        .select('*, bands(id, name, slug, logo_url)')
        .eq('id', releaseId)
        .eq('published', true)
        .single()

      if (!releaseData) { setNotFound(true); setLoading(false); return }
      setRelease(releaseData as any)

      // If the current user is the approved leader of this band, allow quick editing of the release.
      if (user && releaseData.band_id) {
        const { data: membership } = await supabase
          .from('band_members')
          .select('id')
          .eq('band_id', releaseData.band_id)
          .eq('profile_id', user.id)
          .eq('status', 'approved')
          .eq('role', 'leader')
          .maybeSingle()
        if (membership) setCanEditRelease(true)
      }

      const [{ data: trackData }, { data: ratingData }, { data: reviewData }] = await Promise.all([
        supabase.from('tracks').select('*').eq('release_id', releaseId).order('track_number'),
        supabase.from('ratings').select('score, user_id').eq('release_id', releaseId),
        supabase.from('reviews')
          .select('id, title, content, rating, created_at, user_id, profiles(username)')
          .eq('release_id', releaseId)
          .order('created_at', { ascending: false }),
      ])

      if (trackData) setTracks(trackData)
      if (ratingData) {
        setRatingCount(ratingData.length)
        if (ratingData.length > 0) {
          setAvgRating(ratingData.reduce((s, r) => s + r.score, 0) / ratingData.length)
        }
        if (user) {
          const mine = ratingData.find(r => r.user_id === user.id)
          if (mine) { setUserRating(mine.score); setRatingValue(mine.score.toString()) }
        }
      }
      if (reviewData) setReviews(reviewData as any)

      const { data: relatedData } = await supabase
        .from('releases')
        .select('id, title, release_type, release_year, cover_url')
        .eq('band_id', releaseData.band_id)
        .eq('published', true)
        .neq('id', releaseId)
        .order('release_year', { ascending: false })
        .limit(5)
      if (relatedData) setRelatedReleases(relatedData)

      setLoading(false)
    }
    load()
  }, [releaseId])

  const handleSubmitRating = async () => {
    if (!currentUser) return
    setRatingError('')
    const score = parseFloat(ratingValue)
    if (isNaN(score) || score < 0 || score > 20) { setRatingError('Enter a number between 0 and 20'); return }
    if (Math.round(score * 10) / 10 !== score) { setRatingError('Max one decimal place (e.g. 13.5)'); return }
    setSavingRating(true)

    const { data: existing } = await supabase
      .from('ratings').select('id').eq('release_id', releaseId).eq('user_id', currentUser).single()

    if (existing) {
      await supabase.from('ratings').update({ score }).eq('id', existing.id)
    } else {
      await supabase.from('ratings').insert({ release_id: releaseId, user_id: currentUser, score })
    }

    // Recompute avg locally
    const wasRated = userRating !== null
    const newCount = wasRated ? ratingCount : ratingCount + 1
    const newAvg = wasRated
      ? ((avgRating! * ratingCount) - userRating! + score) / ratingCount
      : ((avgRating || 0) * ratingCount + score) / newCount
    setAvgRating(newAvg)
    setRatingCount(newCount)
    setUserRating(score)
    setSavingRating(false)
  }

  const handleSubmitReview = async () => {
    if (!currentUser) return
    const title = reviewTitle.trim()
    const content = reviewContent.trim()
    if (!title || !content) return

    let parsedRating: number | null = null
    if (reviewRating.trim()) {
      parsedRating = parseFloat(reviewRating)
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 20) {
        setReviewError('Rating must be between 0 and 20.')
        return
      }
      parsedRating = Math.round(parsedRating * 10) / 10
    }

    setSubmittingReview(true)
    setReviewError('')

    const existing = reviews.find(r => r.user_id === currentUser)
    if (existing) {
      const { data } = await supabase.from('reviews')
        .update({ title, content, rating: parsedRating })
        .eq('id', existing.id)
        .select('id, title, content, rating, created_at, user_id, profiles(username)')
        .single()
      if (data) setReviews(prev => prev.map(r => r.id === existing.id ? data as any : r))
    } else {
      const { data, error } = await supabase.from('reviews')
        .insert({ release_id: releaseId, user_id: currentUser, title, content, rating: parsedRating })
        .select('id, title, content, rating, created_at, user_id, profiles(username)')
        .single()
      if (error) { setReviewError(error.message); setSubmittingReview(false); return }
      if (data) setReviews(prev => [data as any, ...prev])
    }

    setShowReviewForm(false)
    setSubmittingReview(false)
  }

  const handleDeleteReview = async (reviewId: string) => {
    await supabase.from('reviews').delete().eq('id', reviewId)
    setReviews(prev => prev.filter(r => r.id !== reviewId))
  }

  const openEditReview = () => {
    const mine = reviews.find(r => r.user_id === currentUser)
    if (mine) {
      setReviewTitle(mine.title)
      setReviewContent(mine.content)
      setReviewRating(mine.rating?.toString() || '')
    }
    setShowReviewForm(true)
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Back" />
      <div className="max-w-4xl mx-auto px-6 py-10 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="md:w-52 md:shrink-0">
            <div className="w-48 h-48 md:w-full md:aspect-square bg-zinc-900 mx-auto md:mx-0" />
            <div className="mt-5 space-y-2">
              <div className="h-8 bg-zinc-900 rounded w-24" />
              <div className="h-1.5 bg-zinc-900 rounded-full" />
              <div className="h-3 bg-zinc-900 rounded w-16" />
            </div>
          </div>
          <div className="flex-1 space-y-4 pt-1">
            <div className="h-3 bg-zinc-900 rounded w-28" />
            <div className="h-10 bg-zinc-900 rounded w-64" />
            <div className="flex gap-2">
              <div className="h-5 bg-zinc-900 rounded w-16" />
              <div className="h-5 bg-zinc-900 rounded w-10" />
              <div className="h-5 bg-zinc-900 rounded w-14" />
            </div>
            <div className="h-10 bg-zinc-900 rounded w-48 mt-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-3">
            {[0,1,2,3,4].map(i => <div key={i} className="h-12 bg-zinc-900 rounded-xl" />)}
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-zinc-900 rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  )

  if (notFound || !release) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-500 text-xl">Release not found.</p>
      <Link href="/explore" className="text-red-500 hover:text-red-400 text-sm">← Back to bands</Link>
    </main>
  )

          const band = release.bands

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref={`/bands/${band.slug}`} backLabel={band.name} />

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Two-column header: sticky cover + info */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">

          {/* Sticky left: cover + aggregate rating */}
          <div className="md:sticky md:top-4 md:self-start md:w-52 md:shrink-0">
            <div className="w-48 h-48 md:w-full md:aspect-square bg-zinc-900 border border-zinc-800 overflow-hidden mx-auto md:mx-0 flex items-center justify-center">
              {release.cover_url ? (
                <button
                  type="button"
                  onClick={() => setCoverZoomOpen(true)}
                  className="group w-full h-full flex items-center justify-center cursor-zoom-in"
                >
                  <img
                    src={release.cover_url}
                    alt={release.title}
                    className="w-full h-full object-contain"
                  />
                </button>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">🎵</div>
              )}
            </div>

            {/* Aggregate rating + VU meter */}
            <div className="mt-5 flex flex-col gap-2">
              {avgRating !== null && ratingCount > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black tabular ${avgRating >= 15 ? 'text-green-400' : avgRating >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-zinc-600 text-sm">/20</span>
                  </div>
                  <VUMeter value={avgRating} />
                  <p className="text-xs text-zinc-600">{ratingCount} rating{ratingCount !== 1 ? 's' : ''}</p>
                </>
              ) : (
                <p className="text-xs text-zinc-700 uppercase tracking-widest">No ratings yet</p>
              )}
            </div>
          </div>

          {/* Right: title, meta, rate */}
          <div className="flex-1 min-w-0">
            <Link href={`/bands/${band.slug}`}
              className="flex items-center gap-2 mb-4 group w-fit">
              {band.logo_url && (
                <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                  <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-xs text-zinc-500 group-hover:text-red-400 transition-colors uppercase tracking-widest font-bold">
                {band.name} →
              </span>
            </Link>

            <h1 className="text-4xl md:text-5xl font-display uppercase tracking-tight leading-none mb-4">
              {release.title}
            </h1>

            <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mb-4 uppercase tracking-widest">
              <span className="border border-zinc-700 px-2 py-0.5 rounded">{release.release_type}</span>
              {release.release_year && <span>{release.release_year}</span>}
              <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
            </div>

            {canEditRelease && (
              <div className="mb-6">
                <Link
                  href={`/dashboard/edit-release/${releaseId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:border-red-500 hover:text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                  </svg>
                  Edit release
                </Link>
              </div>
            )}

            {currentUser ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  {userRating !== null ? `Your rating: ${userRating}/20` : 'Rate this release'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number" value={ratingValue} onChange={e => setRatingValue(e.target.value)}
                    min="0" max="20" step="0.1"
                    className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="0–20" />
                  <span className="text-zinc-600 text-sm">/20</span>
                  <button onClick={handleSubmitRating} disabled={savingRating}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
                    {savingRating ? '...' : userRating !== null ? 'Update' : 'Submit'}
                  </button>
                </div>
                {ratingError && <p className="text-red-400 text-xs">{ratingError}</p>}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">
                <Link href="/login" className="text-red-500 hover:text-red-400">Login</Link> to rate this release
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Left: description + tracklist + reviews */}
          <div className="md:col-span-2 flex flex-col gap-8">

            {release.description && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">About</h2>
                <p className="text-zinc-300 leading-relaxed text-sm">{release.description}</p>
              </section>
            )}

            {tracks.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                  Tracklist ({tracks.length})
                </h2>
                <p className="text-[11px] text-zinc-600 mb-3">
                  Click a track to play hosted MP3s in the bottom player, or open its YouTube / SoundCloud embed.
                </p>
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  {tracks.map(track => {
                    const isActive = activeTrack === track.id
                    const hasHostedAudio = !!track.audio_path
                    const embed = track.embed_url ? getEmbedUrl(track.embed_url) : null

                    const handleClick = () => {
                      const nextActive = isActive ? null : track.id
                      setActiveTrack(nextActive)

                      if (hasHostedAudio && track.audio_path) {
                        const { data } = supabase.storage
                          .from('band-logos')
                          .getPublicUrl(track.audio_path)
                        if (data?.publicUrl) {
                          setTrackAndPlay({
                            id: track.id,
                            title: track.title,
                            bandName: band.name,
                            bandSlug: band.slug,
                            releaseTitle: release.title,
                            releaseId,
                            coverUrl: release.cover_url,
                            src: data.publicUrl,
                          })
                        }
                      }
                    }

                    const isPlayingHere = currentTrack?.id === track.id && hasHostedAudio
                    const isEmbedOnly = !hasHostedAudio && !!embed

                    return (
                      <div key={track.id} className="border-b border-zinc-800 last:border-0">
                        <button
                          onClick={handleClick}
                          className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-950 transition-colors text-left">
                          <span
                            className={`flex h-8 items-center gap-1.5 rounded-full border px-2 text-[11px] uppercase tracking-widest shrink-0 tabular ${
                              isPlayingHere
                                ? 'border-red-600/80 bg-red-950/40 text-red-300'
                                : hasHostedAudio
                                  ? 'border-red-700/70 bg-red-950/20 text-red-300'
                                  : 'border-zinc-700 bg-zinc-950 text-zinc-300'
                            }`}
                          >
                            <span className="flex h-4 w-4 items-center justify-center">
                              {isPlayingHere ? (
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <rect x="6" y="5" width="4" height="14" rx="1" />
                                  <rect x="14" y="5" width="4" height="14" rx="1" />
                                </svg>
                              ) : (
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M7 5.25C7 4.558 7.75 4.15 8.333 4.5l9.333 5.25a1 1 0 010 1.732l-9.333 5.25A1 1 0 017 15.75v-10.5z" />
                                </svg>
                              )}
                            </span>
                            <span className="text-[11px] font-semibold text-zinc-100">
                              {track.track_number}
                            </span>
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${isActive ? 'text-red-400' : 'text-zinc-200'}`}>
                                {track.title}
                              </span>
                              {track.lyrics && (
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); setLyricsTrack(track) }}
                                  className="text-[11px] text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500 px-2 py-0.5 rounded transition-colors"
                                >
                                  Lyrics
                                </button>
                              )}
                            </div>
                            {(track.duration || track.lyrics_by || track.music_by) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-0 text-xs text-zinc-600 mt-0.5 items-baseline">
                                {track.duration && <span className="shrink-0">⏱ {track.duration}</span>}
                                <span className="min-w-[11rem] shrink-0 inline-flex items-baseline gap-1.5">
                                  {track.lyrics_by ? (
                                    <>
                                      <span className="text-zinc-500 shrink-0">✍️ Lyrics:</span>
                                      <span>{track.lyrics_by}</span>
                                    </>
                                  ) : null}
                                </span>
                                {track.music_by && (
                                  <span className="flex items-baseline gap-1.5 shrink-0">
                                    <span className="text-zinc-500 shrink-0">🎸 Music:</span>
                                    <span>{track.music_by}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-zinc-700 shrink-0">
                            {hasHostedAudio ? 'MP3' : embed ? (embed.type === 'youtube' ? 'YT' : embed.type === 'soundcloud' ? 'SC' : '') : ''}
                          </span>
                        </button>
                        {isActive && (
                          <div className="px-4 pb-4">
                            {hasHostedAudio && track.audio_path && (
                              <p className="text-xs text-zinc-500">
                                Playing hosted audio in the bottom player.
                              </p>
                            )}
                            {!hasHostedAudio && embed?.type === 'youtube' && (
                              <iframe src={embed.url} className="w-full rounded-lg" style={{ height: '200px' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen />
                            )}
                            {!hasHostedAudio && embed?.type === 'soundcloud' && (
                              <iframe
                                src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(embed.url)}&color=%23ff0000&auto_play=true&hide_related=true&show_comments=false&show_user=false`}
                                className="w-full rounded-lg" style={{ height: '120px' }} allow="autoplay" />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-widest text-zinc-500">
                  Reviews ({reviews.length})
                </h2>
                {currentUser && !showReviewForm && (
                  <button
                    onClick={openEditReview}
                    className="text-xs border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-white px-3 py-1 rounded-lg transition-colors">
                    {reviews.find(r => r.user_id === currentUser) ? 'Edit your review' : '+ Write a review'}
                  </button>
                )}
              </div>

              {showReviewForm && (
                <div className="border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col gap-3">
                  <input
                    type="text" value={reviewTitle} onChange={e => setReviewTitle(e.target.value)}
                    placeholder="Review title" maxLength={120}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors" />
                  <div className="flex items-center gap-3">
                    <input
                      type="number" value={reviewRating} onChange={e => setReviewRating(e.target.value)}
                      min="0" max="20" step="0.1" placeholder="Rating (optional)"
                      className="w-36 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors" />
                    <span className="text-zinc-600 text-sm">/20</span>
                  </div>
                  <textarea
                    value={reviewContent} onChange={e => setReviewContent(e.target.value)}
                    placeholder="Share your thoughts on this release..." maxLength={2000} rows={5}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors resize-y" />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview || !reviewTitle.trim() || !reviewContent.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
                      {submittingReview ? '...'
                        : reviews.find(r => r.user_id === currentUser) ? 'Update Review' : 'Publish Review'}
                    </button>
                    <button onClick={() => setShowReviewForm(false)}
                      className="text-xs text-zinc-600 hover:text-white transition-colors">Cancel</button>
                    <span className="text-xs text-zinc-700 ml-auto">{reviewContent.length}/2000</span>
                  </div>
                  {reviewError && <p className="text-red-400 text-xs">{reviewError}</p>}
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="border border-zinc-800 rounded-xl p-10 text-center">
                  <p className="text-zinc-700 text-sm uppercase tracking-widest">No reviews yet. Be the first!</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-zinc-800/50">
                  {reviews.map(review => (
                    <div key={review.id} className="py-5 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-white">{review.title}</p>
                            {review.rating !== null && (
                              <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${ratingColor(review.rating)}`}>
                                {review.rating.toFixed(1)}/20
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/members/${review.profiles?.username}`}
                              className="text-xs font-bold text-zinc-400 hover:text-red-400 transition-colors">
                              @{review.profiles?.username}
                            </Link>
                            <span className="text-xs text-zinc-700">{timeAgo(review.created_at)}</span>
                          </div>
                        </div>
                        {review.user_id === currentUser && (
                          <div className="flex gap-3 shrink-0">
                            <button onClick={openEditReview}
                              className="text-xs text-zinc-600 hover:text-white transition-colors">Edit</button>
                            <button onClick={() => handleDeleteReview(review.id)}
                              className="text-xs text-zinc-600 hover:text-red-400 transition-colors">Delete</button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-3 leading-relaxed whitespace-pre-line">
                        {review.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!currentUser && (
                <p className="text-xs text-zinc-600 mt-4">
                  <Link href="/login" className="text-red-500 hover:text-red-400">Login</Link> to write a review
                </p>
              )}
            </section>
          </div>

          {/* Right: band card + related releases */}
          <div className="flex flex-col gap-6">
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Band</h2>
              <Link href={`/bands/${band.slug}`}
                className="flex items-center gap-4 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {band.logo_url
                    ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
                    : <span className="text-xl">🤘</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">
                    {band.name}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">View all releases →</p>
                </div>
              </Link>
            </section>

            {relatedReleases.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">More from {band.name}</h2>
                <div className="flex flex-col gap-1">
                  {relatedReleases.map(rel => (
                    <Link key={rel.id} href={`/releases/${rel.id}`}
                      className="flex items-center gap-3 group hover:bg-zinc-900/60 rounded-lg -mx-2 px-2 py-2 transition-colors">
                      <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {rel.cover_url
                          ? <img src={rel.cover_url} alt={rel.title} className="w-full h-full object-cover" />
                          : <span className="text-base">🎵</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold group-hover:text-red-400 transition-colors truncate">
                          {rel.title}
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {rel.release_type}{rel.release_year ? ` · ${rel.release_year}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

        </div>
      </div>

      {lyricsTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setLyricsTrack(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h3 className="text-sm font-bold text-white">Lyrics — {lyricsTrack.title}</h3>
              <button onClick={() => setLyricsTrack(null)} className="text-zinc-500 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-52px)] p-4">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{lyricsTrack.lyrics}</pre>
            </div>
          </div>
        </div>
      )}

      {coverZoomOpen && release.cover_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={() => setCoverZoomOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] border border-zinc-800 bg-black shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCoverZoomOpen(false)}
              className="absolute top-3 right-3 z-10 text-zinc-400 hover:text-white bg-black/60 rounded-full p-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={release.cover_url}
                alt={release.title}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
