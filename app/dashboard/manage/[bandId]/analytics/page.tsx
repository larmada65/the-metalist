'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../../../components/GlobalNav'

type Band = { id: string; name: string; slug: string; logo_url: string | null }

type ReleaseStats = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
  avgRating: number | null
  ratingCount: number
  reviewCount: number
}

type MonthBucket = { label: string; count: number }

type RecentItem =
  | { type: 'follow'; created_at: string; username: string }
  | { type: 'rating'; created_at: string; username: string; releaseTitle: string; score: number }
  | { type: 'review'; created_at: string; username: string; releaseTitle: string }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function ratingColor(r: number) {
  if (r >= 15) return 'text-green-400'
  if (r >= 10) return 'text-yellow-400'
  return 'text-red-400'
}

export default function BandAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const bandId = params.bandId as string
  const supabase = createClient()

  const [band, setBand] = useState<Band | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalFollowers, setTotalFollowers] = useState(0)
  const [newFollowers30d, setNewFollowers30d] = useState(0)
  const [monthlyGrowth, setMonthlyGrowth] = useState<MonthBucket[]>([])
  const [releases, setReleases] = useState<ReleaseStats[]>([])
  const [overallAvg, setOverallAvg] = useState<number | null>(null)
  const [totalRatings, setTotalRatings] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [recentActivity, setRecentActivity] = useState<RecentItem[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: membership } = await supabase.from('band_members')
        .select('role').eq('band_id', bandId).eq('profile_id', user.id).maybeSingle()
      if (membership?.role !== 'leader') { router.push('/dashboard'); return }

      const { data: bandData } = await supabase.from('bands')
        .select('id, name, slug, logo_url').eq('id', bandId).single()
      if (!bandData) { router.push('/dashboard'); return }
      setBand(bandData)

      const { data: releaseData } = await supabase.from('releases')
        .select('id, title, release_type, release_year, cover_url').eq('band_id', bandId)
      const releaseIds = releaseData?.map(r => r.id) || []

      const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const empty = { data: [] as any[] }
      const [
        { data: allFollows },
        ratingResult,
        reviewResult,
        { data: recentFollowsData },
        recentRatingsResult,
        recentReviewsResult,
      ] = await Promise.all([
        supabase.from('follows').select('created_at').eq('band_id', bandId),
        releaseIds.length > 0
          ? supabase.from('ratings').select('score, release_id, created_at').in('release_id', releaseIds)
          : Promise.resolve(empty),
        releaseIds.length > 0
          ? supabase.from('reviews').select('id, release_id, created_at').in('release_id', releaseIds)
          : Promise.resolve(empty),
        supabase.from('follows')
          .select('created_at, profiles(username)')
          .eq('band_id', bandId).gte('created_at', cutoff30d)
          .order('created_at', { ascending: false }).limit(10),
        releaseIds.length > 0
          ? supabase.from('ratings')
              .select('score, release_id, created_at, profiles(username)')
              .in('release_id', releaseIds).gte('created_at', cutoff30d)
              .order('created_at', { ascending: false }).limit(10)
          : Promise.resolve(empty),
        releaseIds.length > 0
          ? supabase.from('reviews')
              .select('id, release_id, created_at, profiles(username)')
              .in('release_id', releaseIds).gte('created_at', cutoff30d)
              .order('created_at', { ascending: false }).limit(10)
          : Promise.resolve(empty),
      ])

      const allRatings: any[] = ratingResult.data || []
      const allReviews: any[] = reviewResult.data || []

      // Follower stats
      const total = allFollows?.length || 0
      const new30d = allFollows?.filter(f => f.created_at >= cutoff30d).length || 0
      setTotalFollowers(total)
      setNewFollowers30d(new30d)

      // Monthly growth (last 6 months)
      const buckets: MonthBucket[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const yr = d.getFullYear()
        const mo = d.getMonth()
        const label = d.toLocaleString('en-US', { month: 'short' })
        const count = (allFollows || []).filter(f => {
          const fd = new Date(f.created_at)
          return fd.getFullYear() === yr && fd.getMonth() === mo
        }).length
        buckets.push({ label, count })
      }
      setMonthlyGrowth(buckets)

      // Release stats
      const ratingsByRelease: Record<string, number[]> = {}
      allRatings.forEach((r: any) => {
        if (!ratingsByRelease[r.release_id]) ratingsByRelease[r.release_id] = []
        ratingsByRelease[r.release_id].push(r.score)
      })
      const reviewsByRelease: Record<string, number> = {}
      allReviews.forEach((r: any) => {
        reviewsByRelease[r.release_id] = (reviewsByRelease[r.release_id] || 0) + 1
      })
      const releaseStats: ReleaseStats[] = (releaseData || []).map(rel => {
        const scores = ratingsByRelease[rel.id] || []
        return {
          ...rel,
          avgRating: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
          ratingCount: scores.length,
          reviewCount: reviewsByRelease[rel.id] || 0,
        }
      }).sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1))
      setReleases(releaseStats)

      // Overall rating stats
      const allScores = allRatings.map((r: any) => r.score)
      setTotalRatings(allScores.length)
      setOverallAvg(
        allScores.length > 0 ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length : null
      )
      setTotalReviews(allReviews.length)

      // Recent activity merged + sorted
      const titleMap: Record<string, string> = {}
      releaseData?.forEach(r => { titleMap[r.id] = r.title })

      const activity: RecentItem[] = [
        ...((recentFollowsData || []).map((f: any) => ({
          type: 'follow' as const,
          created_at: f.created_at,
          username: f.profiles?.username || '?',
        }))),
        ...((recentRatingsResult.data || []).map((r: any) => ({
          type: 'rating' as const,
          created_at: r.created_at,
          username: r.profiles?.username || '?',
          releaseTitle: titleMap[r.release_id] || 'a release',
          score: r.score,
        }))),
        ...((recentReviewsResult.data || []).map((r: any) => ({
          type: 'review' as const,
          created_at: r.created_at,
          username: r.profiles?.username || '?',
          releaseTitle: titleMap[r.release_id] || 'a release',
        }))),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12)

      setRecentActivity(activity)
      setLoading(false)
    }
    load()
  }, [bandId])

  if (loading) return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref={`/dashboard/manage/${bandId}`} backLabel="Manage" />
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-600 animate-pulse">Loading analytics...</p>
      </div>
    </main>
  )

  if (!band) return null

  const maxGrowth = Math.max(...monthlyGrowth.map(m => m.count), 1)

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref={`/dashboard/manage/${bandId}`} backLabel="Manage" />

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          {band.logo_url && (
            <img src={band.logo_url} alt={band.name}
              className="w-12 h-12 rounded-lg object-cover border border-zinc-800" />
          )}
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Analytics</p>
            <h1 className="text-3xl font-black uppercase tracking-tight">{band.name}</h1>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="border border-zinc-800 rounded-xl p-5">
            <p className="text-3xl font-black tabular text-white">{totalFollowers}</p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mt-1">Total Followers</p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5">
            <p className={`text-3xl font-black ${newFollowers30d > 0 ? 'text-green-400' : 'text-white'}`}>
              {newFollowers30d > 0 ? `+${newFollowers30d}` : newFollowers30d}
            </p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mt-1">New (30 days)</p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5">
            <p className="text-3xl font-black tabular text-white">{totalRatings}</p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mt-1">Total Ratings</p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5">
            <p className={`text-3xl font-black ${overallAvg !== null ? ratingColor(overallAvg) : 'text-zinc-600'}`}>
              {overallAvg !== null ? `${overallAvg.toFixed(1)}` : '—'}
            </p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mt-1">
              Avg Rating{overallAvg !== null ? ' /20' : ''}
            </p>
          </div>
        </div>

        {/* Follower growth chart */}
        <section className="border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Follower Growth — Last 6 Months</h2>
          <div className="flex items-end gap-3" style={{ height: '120px' }}>
            {monthlyGrowth.map((bucket, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                <div className="flex-1 w-full flex items-end">
                  <div className="w-full bg-zinc-900 rounded-t-sm relative" style={{ height: '100%' }}>
                    {bucket.count > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-red-600 rounded-t-sm"
                        style={{ height: `${Math.max((bucket.count / maxGrowth) * 100, 4)}%` }}
                      />
                    )}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-xs font-bold text-zinc-400">{bucket.count > 0 ? `+${bucket.count}` : ''}</p>
                  <p className="text-xs text-zinc-700 uppercase tracking-widest">{bucket.label}</p>
                </div>
              </div>
            ))}
          </div>
          {monthlyGrowth.every(b => b.count === 0) && (
            <p className="text-xs text-zinc-700 text-center mt-2">No follower data yet.</p>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Release performance */}
          <section className="border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">Release Performance</h2>
              <span className="text-xs text-zinc-700">{totalReviews} review{totalReviews !== 1 ? 's' : ''} total</span>
            </div>
            {releases.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-zinc-700 text-sm mb-3">No releases yet.</p>
                <Link href="/dashboard/add-release"
                  className="text-xs text-red-500 hover:text-red-400 transition-colors">
                  Add a release →
                </Link>
              </div>
            ) : (
              <div>
                {releases.map(rel => (
                  <Link key={rel.id} href={`/releases/${rel.id}`}
                    className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-950 transition-colors group">
                    <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {rel.cover_url
                        ? <img src={rel.cover_url} alt={rel.title} className="w-full h-full object-cover" />
                        : <span className="text-sm">🎵</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-red-400 transition-colors">
                        {rel.title}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {rel.release_type}{rel.release_year ? ` · ${rel.release_year}` : ''}
                        {rel.reviewCount > 0 && ` · ${rel.reviewCount} review${rel.reviewCount !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {rel.avgRating !== null ? (
                        <>
                          <p className={`text-sm font-black ${ratingColor(rel.avgRating)}`}>
                            {rel.avgRating.toFixed(1)}
                          </p>
                          <p className="text-xs text-zinc-700">
                            {rel.ratingCount} rating{rel.ratingCount !== 1 ? 's' : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-zinc-700">No ratings</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section className="border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">Recent Activity — 30 Days</h2>
            </div>
            {recentActivity.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-zinc-700 text-sm">No activity in the last 30 days.</p>
              </div>
            ) : (
              <div>
                {recentActivity.map((item, i) => (
                  <div key={i}
                    className="flex items-start gap-3 px-5 py-3 border-b border-zinc-800 last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold ${
                      item.type === 'follow'
                        ? 'bg-blue-950/60 text-blue-400'
                        : item.type === 'rating'
                        ? 'bg-green-950/60 text-green-400'
                        : 'bg-orange-950/60 text-orange-400'
                    }`}>
                      {item.type === 'follow' ? '+' : item.type === 'rating' ? '★' : '✍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 leading-snug">
                        <Link href={`/members/${item.username}`}
                          className="font-bold text-white hover:text-red-400 transition-colors">
                          @{item.username}
                        </Link>
                        {item.type === 'follow' && ' started following'}
                        {item.type === 'rating' && ' rated '}
                        {item.type === 'review' && ' reviewed '}
                        {(item.type === 'rating' || item.type === 'review') && (
                          <span className="text-zinc-500 italic">{item.releaseTitle}</span>
                        )}
                        {item.type === 'rating' && (
                          <span className={`font-black ml-1 ${ratingColor(item.score)}`}>
                            {item.score}/20
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-700 shrink-0">{timeAgo(item.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
