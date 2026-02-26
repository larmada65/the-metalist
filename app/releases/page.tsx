import { createClient } from '../../lib/supabase-server'
import ReleasesClient from './client'

export default async function ReleasesPage() {
  const supabase = await createClient()

  const [{ data: releaseData }, { data: ratingData }, { data: genreData }] = await Promise.all([
    supabase
      .from('releases')
      .select('id, title, release_type, release_year, cover_url, created_at, bands(name, slug, logo_url, genre_ids)')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase.from('ratings').select('release_id, score'),
    supabase.from('genres_list').select('id, name').order('name'),
  ])

  const ratingMap: Record<string, number[]> = {}
  ratingData?.forEach((r: any) => {
    if (!ratingMap[r.release_id]) ratingMap[r.release_id] = []
    ratingMap[r.release_id].push(r.score)
  })

  const releases = (releaseData ?? []).map((r: any) => {
    const scores = ratingMap[r.id] || []
    return {
      ...r,
      avgRating: scores.length > 0
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        : null,
      ratingCount: scores.length,
    }
  })

  return <ReleasesClient releases={releases} genres={genreData ?? []} />
}
