'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type FeedItem = {
  id: string
  type: 'release' | 'show' | 'review' | 'post'
  created_at: string
  // band context
  bandName: string
  bandSlug: string
  bandLogo: string | null
  // release
  coverUrl?: string | null
  releaseTitle?: string
  releaseType?: string
  releaseId?: string
  // show
  showDate?: string
  showCity?: string
  showCountry?: string | null
  showVenue?: string | null
  showTicketUrl?: string | null
  // review
  reviewId?: string
  reviewTitle?: string
  reviewContent?: string
  reviewRating?: number | null
  reviewerUsername?: string
  reviewReleaseTitle?: string
  reviewCoverUrl?: string | null
  // post
  postContent?: string
  // context hint
  reason: string
  reasonHref: string
}

type FilterType = 'all' | 'release' | 'show' | 'review' | 'post'

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

function parseShowDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [lastVisit, setLastVisit] = useState<string | null>(null)
  const [followedBandCount, setFollowedBandCount] = useState(0)
  const [followedUserCount, setFollowedUserCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      // Track last visit for "New" badges
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('metalist:lastFeedVisit')
        if (stored) setLastVisit(stored)
        window.localStorage.setItem('metalist:lastFeedVisit', new Date().toISOString())
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user.id)

      // Get followed bands + people
      const [{ data: bandFollows }, { data: userFollows }] = await Promise.all([
        supabase.from('follows').select('band_id, bands(name, slug, logo_url)').eq('user_id', user.id),
        supabase.from('user_follows').select('following_id, profiles!user_follows_following_id_fkey(username)').eq('follower_id', user.id),
      ])

      const followedBandIds = bandFollows?.map((f: any) => f.band_id) || []
      const followedUserIds = userFollows?.map((f: any) => f.following_id) || []
      const bandMeta: Record<string, { name: string; slug: string; logo: string | null }> = {}
      bandFollows?.forEach((f: any) => {
        if (f.bands) bandMeta[f.band_id] = { name: f.bands.name, slug: f.bands.slug, logo: f.bands.logo_url }
      })
      const userMeta: Record<string, string> = {}
      userFollows?.forEach((f: any) => {
        if (f.profiles) userMeta[f.following_id] = f.profiles.username
      })

      setFollowedBandCount(followedBandIds.length)
      setFollowedUserCount(followedUserIds.length)

      const feed: FeedItem[] = []

      // Releases from followed bands
      if (followedBandIds.length > 0) {
        const { data: releases } = await supabase
          .from('releases')
          .select('id, title, release_type, cover_url, created_at, band_id')
          .in('band_id', followedBandIds)
          .order('created_at', { ascending: false })
          .limit(30)

        releases?.forEach((r: any) => {
          const band = bandMeta[r.band_id]
          if (!band) return
          feed.push({
            id: `release-${r.id}`,
            type: 'release',
            created_at: r.created_at,
            bandName: band.name,
            bandSlug: band.slug,
            bandLogo: band.logo,
            coverUrl: r.cover_url,
            releaseTitle: r.title,
            releaseType: r.release_type,
            releaseId: r.id,
            reason: `You follow ${band.name}`,
            reasonHref: `/bands/${band.slug}`,
          })
        })

        // Upcoming shows from followed bands
        const today = new Date().toISOString().split('T')[0]
        const { data: shows } = await supabase
          .from('shows')
          .select('id, date, city, country, venue, ticket_url, created_at, band_id')
          .in('band_id', followedBandIds)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(20)

        shows?.forEach((s: any) => {
          const band = bandMeta[s.band_id]
          if (!band) return
          feed.push({
            id: `show-${s.id}`,
            type: 'show',
            created_at: s.created_at,
            bandName: band.name,
            bandSlug: band.slug,
            bandLogo: band.logo,
            showDate: s.date,
            showCity: s.city,
            showCountry: s.country,
            showVenue: s.venue,
            showTicketUrl: s.ticket_url,
            reason: `You follow ${band.name}`,
            reasonHref: `/bands/${band.slug}`,
          })
        })

        // Posts from followed bands
        const { data: posts } = await supabase
          .from('band_posts')
          .select('id, content, created_at, band_id')
          .in('band_id', followedBandIds)
          .order('created_at', { ascending: false })
          .limit(20)

        posts?.forEach((p: any) => {
          const band = bandMeta[p.band_id]
          if (!band) return
          feed.push({
            id: `post-${p.id}`,
            type: 'post',
            created_at: p.created_at,
            bandName: band.name,
            bandSlug: band.slug,
            bandLogo: band.logo,
            postContent: p.content,
            reason: `You follow ${band.name}`,
            reasonHref: `/bands/${band.slug}`,
          })
        })
      }

      // Reviews from followed users
      if (followedUserIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('id, title, content, rating, created_at, user_id, releases(title, cover_url, bands(name, slug, logo_url))')
          .in('user_id', followedUserIds)
          .order('created_at', { ascending: false })
          .limit(20)

        reviews?.forEach((r: any) => {
          const band = r.releases?.bands
          const username = userMeta[r.user_id]
          feed.push({
            id: `review-${r.id}`,
            type: 'review',
            created_at: r.created_at,
            bandName: band?.name || 'Unknown Band',
            bandSlug: band?.slug || '',
            bandLogo: band?.logo_url || null,
            reviewId: r.id,
            reviewTitle: r.title,
            reviewContent: r.content,
            reviewRating: r.rating,
            reviewerUsername: username,
            reviewReleaseTitle: r.releases?.title,
            reviewCoverUrl: r.releases?.cover_url,
            reason: `@${username} you follow`,
            reasonHref: `/members/${username}`,
          })
        })
      }

      // Sort: shows by date first within shows, everything else by created_at
      feed.sort((a, b) => {
        if (a.type === 'show' && b.type === 'show') {
          return (a.showDate || '').localeCompare(b.showDate || '')
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setItems(feed)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)
  const counts = {
    release: items.filter(i => i.type === 'release').length,
    show: items.filter(i => i.type === 'show').length,
    review: items.filter(i => i.type === 'review').length,
    post: items.filter(i => i.type === 'post').length,
  }

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shrink-0 border ${
      active
        ? 'bg-red-600 border-red-600 text-white'
        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
    }`

  const isEmpty = !loading && followedBandCount === 0 && followedUserCount === 0

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav />

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-display uppercase tracking-tight mb-2">My Feed</h1>
          <p className="text-zinc-600 text-sm">
            New releases, shows, and reviews from bands and people you follow.
          </p>
        </div>

        {/* Filter pills */}
        {!loading && items.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            <button onClick={() => setFilter('all')} className={pillClass(filter === 'all')}>
              All ({items.length})
            </button>
            {counts.release > 0 && (
              <button onClick={() => setFilter('release')} className={pillClass(filter === 'release')}>
                💿 Releases ({counts.release})
              </button>
            )}
            {counts.show > 0 && (
              <button onClick={() => setFilter('show')} className={pillClass(filter === 'show')}>
                📅 Shows ({counts.show})
              </button>
            )}
            {counts.review > 0 && (
              <button onClick={() => setFilter('review')} className={pillClass(filter === 'review')}>
                ✍️ Reviews ({counts.review})
              </button>
            )}
            {counts.post > 0 && (
              <button onClick={() => setFilter('post')} className={pillClass(filter === 'post')}>
                📣 Updates ({counts.post})
              </button>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/4" />
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty — not following anyone */}
        {isEmpty && (
          <div className="border border-zinc-800 rounded-xl p-16 text-center">
            <p className="text-5xl mb-4">🌑</p>
            <p className="text-zinc-400 font-black uppercase tracking-wide text-lg mb-2">
              Your feed is empty
            </p>
            <p className="text-zinc-600 text-sm mb-8 max-w-xs mx-auto">
              Follow bands to see their new releases and shows. Follow members to see their reviews.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/explore"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">
                Explore Bands
              </Link>
              <Link href="/members"
                className="px-6 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">
                Browse Members
              </Link>
            </div>
          </div>
        )}

        {/* Follows bands/people but nothing in feed */}
        {!loading && !isEmpty && items.length === 0 && (
          <div className="border border-zinc-800 rounded-xl p-16 text-center">
            <p className="text-5xl mb-4">🤘</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">
              Nothing new yet — check back soon.
            </p>
          </div>
        )}

        {/* Feed */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map(item => (
              <FeedCard key={item.id} item={item} lastVisit={lastVisit} />
            ))}
          </div>
        )}

        {/* No results for current filter */}
        {!loading && items.length > 0 && filtered.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-12">
            Nothing in this category yet.
          </p>
        )}
      </div>
    </main>
  )
}

function isNewItem(item: FeedItem, lastVisit: string | null): boolean {
  if (!lastVisit) return false
  const created = new Date(item.created_at).getTime()
  const last = new Date(lastVisit).getTime()
  return created > last
}

function FeedCard({ item, lastVisit }: { item: FeedItem; lastVisit: string | null }) {
  const isNew = isNewItem(item, lastVisit)
  if (item.type === 'release') {
    return (
      <Link href={`/bands/${item.bandSlug}`}
        className="border border-zinc-800 rounded-xl p-4 flex gap-4 hover:border-zinc-700 transition-colors group">
        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
          {item.coverUrl
            ? <img src={item.coverUrl} alt={item.releaseTitle} className="w-full h-full object-cover" />
            : <span className="text-xl opacity-20">💿</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-600 mb-1">
            <span className="text-purple-400 font-bold uppercase tracking-widest text-xs border border-purple-900/40 px-1.5 py-0.5 rounded mr-2">
              New Release
            </span>
            {timeAgo(item.created_at)}
            {isNew && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-red-400">
                New
              </span>
            )}
          </p>
          <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">
            {item.releaseTitle}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {item.releaseType} · {item.bandName}
          </p>
          <p className="text-xs text-zinc-700 mt-2">
            <span className="hover:text-zinc-500 transition-colors">{item.reason}</span>
          </p>
        </div>
      </Link>
    )
  }

  if (item.type === 'show') {
    const d = parseShowDate(item.showDate!)
    const day = String(d.getDate()).padStart(2, '0')
    const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()

    return (
      <div className="border border-zinc-800 rounded-xl p-4 flex gap-4 hover:border-zinc-700 transition-colors">
        {/* Date block */}
        <div className="w-12 shrink-0 text-center flex flex-col items-center justify-center">
          <p className="text-xl font-black leading-none">{day}</p>
          <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-0.5">{mon}</p>
        </div>
        <div className="w-px bg-zinc-800 shrink-0" />
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center self-center">
          {item.bandLogo
            ? <img src={item.bandLogo} alt={item.bandName} className="w-full h-full object-cover" />
            : <span className="text-lg opacity-20">🤘</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-600 mb-1">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-xs border border-amber-900/40 px-1.5 py-0.5 rounded mr-2">
              Show
            </span>
            {isNew && (
              <span className="ml-1 text-[10px] uppercase tracking-widest text-red-400">
                New
              </span>
            )}
          </p>
          <Link href={`/bands/${item.bandSlug}`}
            className="font-black uppercase tracking-wide text-sm hover:text-red-500 transition-colors">
            {item.bandName}
          </Link>
          <p className="text-xs text-zinc-500 mt-0.5">
            {[item.showVenue, item.showCity, item.showCountry].filter(Boolean).join(' · ')}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-xs text-zinc-700">
              <Link href={item.reasonHref} className="hover:text-zinc-500 transition-colors">{item.reason}</Link>
            </p>
            {item.showTicketUrl && (
              <a href={item.showTicketUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs border border-zinc-700 hover:border-red-500 hover:text-white text-zinc-500 px-2.5 py-1 rounded-lg transition-colors uppercase tracking-widest font-bold">
                Tickets
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (item.type === 'post') {
    return (
      <Link href={`/bands/${item.bandSlug}`}
        className="border border-zinc-800 rounded-xl p-4 flex gap-4 hover:border-zinc-700 transition-colors group">
        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
          {item.bandLogo
            ? <img src={item.bandLogo} alt={item.bandName} className="w-full h-full object-cover" />
            : <span className="text-xl opacity-20">🤘</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-600 mb-1">
            <span className="text-orange-400 font-bold uppercase tracking-widest text-xs border border-orange-900/40 px-1.5 py-0.5 rounded mr-2">
              Update
            </span>
            {timeAgo(item.created_at)}
            {isNew && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-red-400">
                New
              </span>
            )}
          </p>
          <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">
            {item.bandName}
          </p>
          <p className="text-sm text-zinc-400 mt-1 line-clamp-2 leading-relaxed whitespace-pre-wrap">
            {item.postContent}
          </p>
          <p className="text-xs text-zinc-700 mt-2">
            <span className="hover:text-zinc-500 transition-colors">{item.reason}</span>
          </p>
        </div>
      </Link>
    )
  }

  // review
  return (
    <Link href={`/reviews/${item.reviewId}`}
      className="border border-zinc-800 rounded-xl p-4 flex gap-4 hover:border-zinc-700 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
        {item.reviewCoverUrl
          ? <img src={item.reviewCoverUrl} alt={item.reviewReleaseTitle} className="w-full h-full object-cover" />
          : <span className="text-xl opacity-20">✍️</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-600 mb-1">
          <span className="text-green-400 font-bold uppercase tracking-widest text-xs border border-green-900/40 px-1.5 py-0.5 rounded mr-2">
            Review
          </span>
          {timeAgo(item.created_at)}
          {isNew && (
            <span className="ml-2 text-[10px] uppercase tracking-widest text-red-400">
              New
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">
            {item.reviewTitle}
          </p>
          {item.reviewRating !== null && item.reviewRating !== undefined && (
            <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${
              item.reviewRating >= 15 ? 'text-green-400 bg-green-950/40 border-green-900/50'
              : item.reviewRating >= 10 ? 'text-yellow-400 bg-yellow-950/40 border-yellow-900/50'
              : 'text-red-400 bg-red-950/40 border-red-900/50'
            }`}>
              {item.reviewRating.toFixed(1)}/20
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {item.reviewReleaseTitle} · {item.bandName}
        </p>
        <p className="text-sm text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
          {item.reviewContent}
        </p>
        <p className="text-xs text-zinc-700 mt-2">
          <span className="hover:text-zinc-500 transition-colors">{item.reason}</span>
        </p>
      </div>
    </Link>
  )
}
