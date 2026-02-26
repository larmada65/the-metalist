import { createClient } from '../../lib/supabase-server'
import RankingsClient from './client'

export default async function RankingsPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const [
    { data: genreData },
    { data: allRatings },
    { data: followData },
    { data: releaseData },
    { data: bandData },
    { data: recentFollowData },
    { data: recentReleaseData },
  ] = await Promise.all([
    supabase.from('genres_list').select('id, name').order('name'),
    supabase.from('ratings').select('release_id, score'),
    supabase.from('follows').select('band_id'),
    supabase.from('releases').select('id, title, release_type, release_year, cover_url, band_id').eq('published', true),
    supabase.from('bands').select('id, name, slug, logo_url, country, genre_ids').eq('is_published', true),
    supabase.from('follows').select('band_id').gte('created_at', cutoff),
    supabase.from('releases').select('band_id').eq('published', true).gte('created_at', cutoff),
  ])

  const bands = bandData ?? []
  const releases = releaseData ?? []

  // Top Rated
  const ratingMap = new Map<string, { total: number; count: number }>()
  for (const r of allRatings ?? []) {
    const cur = ratingMap.get(r.release_id) || { total: 0, count: 0 }
    ratingMap.set(r.release_id, { total: cur.total + Number(r.score), count: cur.count + 1 })
  }
  const allRated = [...ratingMap.entries()]
    .map(([id, { total, count }]) => {
      const rel = releases.find((r: any) => r.id === id)
      const band = bands.find((b: any) => b.id === rel?.band_id)
      if (!rel || !band) return null
      return {
        id: rel.id, title: rel.title, release_type: rel.release_type,
        release_year: rel.release_year, cover_url: rel.cover_url,
        avg: total / count, ratingCount: count,
        band_id: band.id, band_name: band.name, band_slug: band.slug,
        band_genre_ids: band.genre_ids,
      }
    })
    .filter(Boolean) as any[]
  allRated.sort((a, b) => b.avg - a.avg || b.ratingCount - a.ratingCount)

  // Most Followed
  const followCount = new Map<string, number>()
  for (const f of followData ?? []) {
    followCount.set(f.band_id, (followCount.get(f.band_id) || 0) + 1)
  }
  const allFollowed = [...followCount.entries()]
    .map(([band_id, count]) => {
      const band = bands.find((b: any) => b.id === band_id)
      if (!band) return null
      return { ...band, followCount: count }
    })
    .filter(Boolean) as any[]
  allFollowed.sort((a, b) => b.followCount - a.followCount)

  // Most Active
  const relCount = new Map<string, number>()
  for (const r of releases) {
    relCount.set((r as any).band_id, (relCount.get((r as any).band_id) || 0) + 1)
  }
  const allActive = [...relCount.entries()]
    .map(([band_id, count]) => {
      const band = bands.find((b: any) => b.id === band_id)
      if (!band) return null
      return { ...band, releaseCount: count }
    })
    .filter(Boolean) as any[]
  allActive.sort((a, b) => b.releaseCount - a.releaseCount)

  // Trending
  const recentFollowCount = new Map<string, number>()
  for (const f of recentFollowData ?? []) {
    recentFollowCount.set(f.band_id, (recentFollowCount.get(f.band_id) || 0) + 1)
  }
  const recentReleaseCount = new Map<string, number>()
  for (const r of recentReleaseData ?? []) {
    recentReleaseCount.set((r as any).band_id, (recentReleaseCount.get((r as any).band_id) || 0) + 1)
  }
  const trendingBandIds = new Set([...recentFollowCount.keys(), ...recentReleaseCount.keys()])
  const allTrending = [...trendingBandIds]
    .map(bandId => {
      const band = bands.find((b: any) => b.id === bandId)
      if (!band) return null
      const rf = recentFollowCount.get(bandId) || 0
      const rr = recentReleaseCount.get(bandId) || 0
      return { ...band, recentFollows: rf, recentReleases: rr, score: rf * 3 + rr * 5 }
    })
    .filter(Boolean) as any[]
  allTrending.sort((a, b) => b.score - a.score)

  return (
    <RankingsClient
      genres={genreData ?? []}
      allRated={allRated}
      allFollowed={allFollowed}
      allActive={allActive}
      allTrending={allTrending}
    />
  )
}
