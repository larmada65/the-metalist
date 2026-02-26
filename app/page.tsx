import { createClient } from '../lib/supabase-server'
import HomeClient from './home-client'

// Cache the home page and revalidate periodically so most visitors
// get a fast, mostly-static version instead of full SSR on every hit.
export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // Fetch everything we need in parallel, keeping selects lean where possible.
  const [
    authResult,
    { count: bandCount },
    { count: releaseCount },
    { count: memberCount },
    { data: genreData },
    { data: bandList },
    { data: allRatings },
    { data: allReleasesForRatings },
    { data: latestReleaseData },
    { data: reviewData },
    { data: showData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('bands').select('id', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('releases').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('band_members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved').not('profile_id', 'is', null),
    supabase.from('genres_list').select('id, name'),
    supabase.from('bands')
      .select('id, name, slug, country, logo_url, genre_ids')
      .eq('is_published', true).order('created_at', { ascending: false }).limit(9),
    supabase.from('ratings').select('release_id, score'),
    supabase.from('releases')
      .select('id, title, release_type, release_year, cover_url, bands(name, slug)')
      .eq('published', true)
      .eq('bands.is_published', true),
    supabase.from('releases')
      .select('id, title, release_type, release_year, cover_url, bands(name, slug)')
      .eq('published', true)
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('reviews')
      .select('id, title, content, rating, created_at, profiles(username), releases(title, cover_url, bands(name, slug))')
      .eq('releases.published', true)
      .order('created_at', { ascending: false }).limit(3),
    supabase.from('shows')
      .select('id, date, city, country, venue, ticket_url, bands(name, slug, logo_url)')
      .gte('date', today).order('date', { ascending: true }).limit(6),
  ])

  const user = authResult.data.user

  // Compute top rated from pre-fetched data (no extra round-trips).
  const ratingMap = new Map<string, { total: number; count: number }>()
  for (const r of allRatings ?? []) {
    const cur = ratingMap.get(r.release_id) || { total: 0, count: 0 }
    ratingMap.set(r.release_id, { total: cur.total + Number(r.score), count: cur.count + 1 })
  }
  const topReleases = [...ratingMap.entries()]
    .map(([id, { total, count }]) => {
      const rel = (allReleasesForRatings ?? []).find((r: any) => r.id === id) as any
      if (!rel) return null
      return {
        id: rel.id,
        title: rel.title,
        release_type: rel.release_type,
        release_year: rel.release_year,
        cover_url: rel.cover_url,
        avg: total / count,
        band_name: rel.bands?.name || '',
        band_slug: rel.bands?.slug || '',
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.avg - a.avg || b.count - a.count)
    .slice(0, 6) as any[]

  const latestReleases = (latestReleaseData ?? []).map((r: any) => ({
    id: r.id, title: r.title, release_type: r.release_type,
    release_year: r.release_year, cover_url: r.cover_url,
    band_name: r.bands?.name || '', band_slug: r.bands?.slug || '',
  }))

  const recentReviews = (reviewData ?? []).map((r: any) => ({
    id: r.id, title: r.title, content: r.content, rating: r.rating,
    created_at: r.created_at, author: r.profiles?.username || 'Anonymous',
    release_title: r.releases?.title || '', release_cover: r.releases?.cover_url || null,
    band_name: r.releases?.bands?.name || '', band_slug: r.releases?.bands?.slug || '',
  }))

  return (
    <HomeClient
      initialUserId={user?.id ?? null}
      stats={{ bands: bandCount || 0, releases: releaseCount || 0, members: memberCount || 0 }}
      genres={genreData ?? []}
      recentBands={bandList ?? []}
      latestReleases={latestReleases}
      topReleases={topReleases}
      recentReviews={recentReviews}
      recentShows={(showData ?? []) as any[]}
    />
  )
}
