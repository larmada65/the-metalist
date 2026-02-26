'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type ReviewEntry = {
  id: string
  title: string
  content: string
  rating: number | null
  created_at: string
  profiles: { username: string } | null
  releases: {
    id: string
    title: string
    release_type: string
    cover_url: string | null
    bands: { name: string; slug: string; genre_ids: number[] | null } | null
  } | null
}

type Genre = { id: number; name: string }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data }, { data: genreData }] = await Promise.all([
        supabase.from('reviews')
          .select(`id, title, content, rating, created_at, profiles(username), releases(id, title, release_type, cover_url, bands(name, slug, genre_ids))`)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('genres_list').select('id, name').order('name'),
      ])
      if (data) setReviews(data as any)
      if (genreData) setAllGenres(genreData)
      setLoading(false)
    }
    load()
  }, [])

  const activeGenres = allGenres.filter(g =>
    reviews.some(r => (r.releases as any)?.bands?.genre_ids?.includes(g.id))
  )

  const filtered = reviews.filter(r =>
    !selectedGenre || (r.releases as any)?.bands?.genre_ids?.includes(selectedGenre)
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Bands" />

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-display uppercase tracking-tight mb-2">Reviews</h1>
          <p className="text-zinc-600 text-sm">
            Long-form reviews written by the community. One per release, per member.
          </p>
        </div>

        {/* Stats + genre filter */}
        {!loading && reviews.length > 0 && (
          <div className="mb-10 border-b border-zinc-800 pb-8 flex flex-col gap-5">
            <div>
              <p className="text-3xl font-black tabular">{reviews.length}</p>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">
                Review{reviews.length !== 1 ? 's' : ''} published
              </p>
            </div>
            {activeGenres.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-zinc-600 uppercase tracking-widest shrink-0">Genre:</span>
                <button onClick={() => setSelectedGenre(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
                    selectedGenre === null ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}>All</button>
                {activeGenres.map(g => (
                  <button key={g.id} onClick={() => setSelectedGenre(prev => prev === g.id ? null : g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
                      selectedGenre === g.id ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}>{g.name}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-5 flex gap-4">
                <div className="w-14 h-14 bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-zinc-800 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/4" />
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3 mt-2" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">✍️</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              The critics are silent. Write the first review.
            </p>
            <p className="text-zinc-700 text-xs mt-4 max-w-xs mx-auto">
              Open any release on a band page and be the first to write one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(review => {
              const band = (review.releases as any)?.bands
              const release = review.releases
              return (
                <article key={review.id}
                  className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex gap-4">
                    {/* Cover */}
                    <Link href={`/reviews/${review.id}`}
                      className="w-14 h-14 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {release?.cover_url
                        ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                        : <span className="text-xl opacity-20">🎵</span>}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Release + band */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <Link href={`/bands/${band?.slug}`}
                            className="text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest font-bold">
                            {band?.name}
                          </Link>
                          <p className="text-xs text-zinc-700 mt-0.5">
                            {release?.title}
                            {release?.release_type ? ` · ${release.release_type}` : ''}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-700 shrink-0">{timeAgo(review.created_at)}</p>
                      </div>

                      {/* Review title + rating */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Link href={`/reviews/${review.id}`}
                          className="font-black uppercase tracking-wide text-sm hover:text-red-500 transition-colors">
                          {review.title}
                        </Link>
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

                      {/* Excerpt */}
                      <p className="text-sm text-zinc-400 mt-1 leading-relaxed line-clamp-3">
                        {review.content}
                      </p>

                      {/* Author */}
                      <p className="text-xs text-zinc-600 mt-3">
                        by <span className="text-zinc-400 font-bold">{review.profiles?.username}</span>
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
