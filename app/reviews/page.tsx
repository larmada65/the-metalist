'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type ReviewEntry = {
  id: string
  title: string
  content: string
  created_at: string
  profiles: { username: string } | null
  releases: {
    id: string
    title: string
    release_type: string
    cover_url: string | null
    bands: { name: string; slug: string } | null
  } | null
}

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
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('reviews')
        .select(`
          id, title, content, created_at,
          profiles(username),
          releases(id, title, release_type, cover_url, bands(name, slug))
        `)
        .order('created_at', { ascending: false })
        .limit(30)
      if (data) setReviews(data as any)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/explore" backLabel="Explore" />

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-black uppercase tracking-tight mb-2">Reviews</h1>
          <p className="text-zinc-600 text-sm">
            Long-form reviews written by the community. One per release, per member.
          </p>
        </div>

        {/* Stats */}
        {!loading && reviews.length > 0 && (
          <div className="mb-10 border-b border-zinc-800 pb-8">
            <p className="text-3xl font-black">{reviews.length}</p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">
              Review{reviews.length !== 1 ? 's' : ''} published
            </p>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-5 flex gap-4">
                <div className="w-14 h-14 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
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
        ) : reviews.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">✍️</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              No reviews yet.
            </p>
            <p className="text-zinc-700 text-xs mt-4 max-w-xs mx-auto">
              Open any release on a band page and be the first to write one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map(review => {
              const band = (review.releases as any)?.bands
              const release = review.releases
              return (
                <article key={review.id}
                  className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex gap-4">
                    {/* Cover */}
                    <Link href={`/bands/${band?.slug}`}
                      className="w-14 h-14 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
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

                      {/* Review title */}
                      <p className="font-black uppercase tracking-wide text-sm mt-3">
                        {review.title}
                      </p>

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
