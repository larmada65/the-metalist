'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'

type Review = {
  id: string
  title: string
  content: string
  rating: number | null
  created_at: string
  user_id: string
  profiles: { username: string } | null
  releases: {
    title: string
    release_type: string
    release_year: number | null
    cover_url: string | null
    bands: { name: string; slug: string; logo_url: string | null } | null
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

export default function ReviewPageClient({ id }: { id: string }) {
  const [review, setReview] = useState<Review | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, title, content, rating, created_at, user_id, profiles(username), releases(title, release_type, release_year, cover_url, bands(name, slug, logo_url))')
        .eq('id', id)
        .single()

      if (!data) { setNotFound(true); setLoading(false); return }
      setReview(data as any)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-600 animate-pulse">Loading...</p>
    </main>
  )

  if (notFound || !review) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-500 text-xl">Review not found.</p>
      <Link href="/reviews" className="text-red-500 hover:text-red-400 text-sm">← All Reviews</Link>
    </main>
  )

  const band = review.releases?.bands
  const release = review.releases

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/reviews" backLabel="Reviews" />

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Release header */}
        <div className="flex gap-5 mb-10">
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
            {release?.cover_url
              ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
              : <span className="text-3xl opacity-20">🎵</span>}
          </div>
          <div className="min-w-0">
            {band && (
              <Link href={`/bands/${band.slug}`}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest font-bold">
                {band.name}
              </Link>
            )}
            <p className="text-xl font-black uppercase tracking-tight mt-1 leading-tight">
              {release?.title}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {release?.release_type}
              {release?.release_year ? ` · ${release.release_year}` : ''}
            </p>
          </div>
        </div>

        {/* Review */}
        <article className="border border-zinc-800 rounded-xl p-6">
          {/* Title + rating */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h1 className="text-2xl font-display uppercase tracking-tight leading-tight">
                {review.title}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Link href={`/members/${review.profiles?.username}`}
                  className="text-sm text-zinc-500 hover:text-red-400 transition-colors">
                  by <span className="font-bold text-zinc-300">{review.profiles?.username}</span>
                </Link>
                <span className="text-zinc-700">·</span>
                <span className="text-xs text-zinc-600">{timeAgo(review.created_at)}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-xs text-zinc-600">
                  {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
            {review.rating !== null && (
              <div className={`text-center px-4 py-2 rounded-lg border ${
                review.rating >= 15 ? 'text-green-400 bg-green-950/40 border-green-900/50'
                : review.rating >= 10 ? 'text-yellow-400 bg-yellow-950/40 border-yellow-900/50'
                : 'text-red-400 bg-red-950/40 border-red-900/50'
              }`}>
                <p className="text-2xl font-black leading-none">{review.rating.toFixed(1)}</p>
                <p className="text-xs opacity-60 mt-0.5">/ 20</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800 mb-6" />

          {/* Body */}
          <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
            {review.content}
          </div>
        </article>

        {/* Back to band */}
        {band && (
          <div className="mt-8 flex justify-between items-center">
            <Link href={`/bands/${band.slug}`}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
              ← Back to {band.name}
            </Link>
            <Link href="/reviews"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest">
              All Reviews →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
