import { Metadata } from 'next'
import MemberProfileClient from './client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchProfileMeta(username: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&select=username,first_name,last_name,bio`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data?.[0] ?? null
}

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params
  const profile = await fetchProfileMeta(username)

  if (!profile) {
    return { title: 'Member Not Found — The Metalist' }
  }

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
  const description =
    profile.bio || `${displayName}'s profile on The Metalist metal community.`

  return {
    title: `${displayName} (@${profile.username}) — The Metalist`,
    description,
    openGraph: {
      title: `${displayName} on The Metalist`,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${displayName} on The Metalist`,
      description,
    },
  }
}

export default async function MemberPage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  return <MemberProfileClient username={username} />
}
