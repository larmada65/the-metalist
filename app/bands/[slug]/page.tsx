import { Metadata } from 'next'
import BandPageClient from './client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchBandMeta(slug: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bands?slug=eq.${encodeURIComponent(slug)}&select=name,description,country,logo_url&is_published=eq.true`,
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
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const band = await fetchBandMeta(slug)

  if (!band) {
    return { title: 'Band Not Found — The Metalist' }
  }

  const description =
    band.description ||
    `${band.name} is a metal band${band.country ? ` from ${band.country}` : ''} on The Metalist.`

  return {
    title: `${band.name} — The Metalist`,
    description,
    openGraph: {
      title: band.name,
      description,
      images: band.logo_url ? [{ url: band.logo_url }] : [],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: band.name,
      description,
      images: band.logo_url ? [band.logo_url] : [],
    },
  }
}

export default async function BandPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  return <BandPageClient slug={slug} />
}
