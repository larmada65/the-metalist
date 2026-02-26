import { createClient } from '../../lib/supabase-server'
import ExploreClient from './client'

export default async function ExplorePage(props: {
  searchParams: Promise<{ genre?: string; influence?: string }>
}) {
  const sp = await props.searchParams
  const supabase = await createClient()

  const [
    { data: bands },
    { data: genres },
    { data: influences },
    { data: bandInfluences },
    { data: follows },
  ] = await Promise.all([
    supabase
      .from('bands')
      .select('id, name, slug, country, year_formed, genre_ids, logo_url')
      .eq('is_published', true)
      .order('name'),
    supabase.from('genres_list').select('id, name').order('name'),
    supabase.from('influences_list').select('id, name').order('name'),
    supabase.from('band_influences').select('band_id, influence_id'),
    supabase.from('follows').select('band_id'),
  ])

  const followerCounts: Record<string, number> = {}
  follows?.forEach((f: any) => {
    followerCounts[f.band_id] = (followerCounts[f.band_id] || 0) + 1
  })

  return (
    <ExploreClient
      bands={bands ?? []}
      genres={genres ?? []}
      influences={influences ?? []}
      bandInfluences={bandInfluences ?? []}
      followerCounts={followerCounts}
      initialGenreId={sp.genre ? parseInt(sp.genre) : null}
      initialInfluenceId={sp.influence ? parseInt(sp.influence) : null}
    />
  )
}
