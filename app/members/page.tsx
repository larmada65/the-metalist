import { createClient } from '../../lib/supabase-server'
import MembersClient from './client'

export default async function MembersPage() {
  const supabase = await createClient()

  const [{ data: profileData }, { data: genreData }, { data: membershipData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, first_name, last_name, bio, is_producer, is_sound_engineer, genre_ids, avatar_url, musician_instruments, musician_level, musician_link, production_level, studio_gear')
      .order('username'),
    supabase.from('genres_list').select('id, name').order('name'),
    supabase.from('band_members').select('profile_id').eq('status', 'approved'),
  ])

  const bandCounts: Record<string, number> = {}
  membershipData?.forEach((m: any) => {
    if (m.profile_id) bandCounts[m.profile_id] = (bandCounts[m.profile_id] || 0) + 1
  })

  const members = (profileData ?? []).map((p: any) => ({
    ...p,
    band_count: bandCounts[p.id] || 0,
  }))

  return <MembersClient members={members} genres={genreData ?? []} />
}
