import { Metadata } from 'next'
import ReleaseClient from './client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchReleaseMeta(id: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/releases?id=eq.${encodeURIComponent(id)}&select=title,release_type,release_year,cover_url,bands(name)`,
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
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const release = await fetchReleaseMeta(id)

  if (!release) return { title: 'Release — The Metalist' }

  const band = (release.bands as any)?.name || ''
  const year = release.release_year ? ` (${release.release_year})` : ''
  const title = `${release.title}${year}`
  const description = `${release.release_type}${band ? ` by ${band}` : ''}. Ratings and reviews on The Metalist.`

  return {
    title: `${title} — ${band} — The Metalist`,
    description,
    openGraph: {
      title,
      description,
      images: release.cover_url ? [{ url: release.cover_url }] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: release.cover_url ? [release.cover_url] : [],
    },
  }
}

export default async function ReleasePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return <ReleaseClient releaseId={id} />
}
