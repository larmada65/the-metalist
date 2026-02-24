import { Metadata } from 'next'
import ReviewPageClient from './client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchReviewMeta(id: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}&select=title,content,profiles(username),releases(title,bands(name))`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
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
  const review = await fetchReviewMeta(id)
  if (!review) return { title: 'Review — The Metalist' }

  const bandName = review.releases?.bands?.name
  const releaseTitle = review.releases?.title
  const author = review.profiles?.username
  const description = review.content?.slice(0, 160) || `A review by ${author} on The Metalist.`

  return {
    title: `"${review.title}"${bandName ? ` — ${bandName}` : ''} · The Metalist`,
    description,
    openGraph: {
      title: review.title,
      description,
      type: 'article',
    },
  }
}

export default async function ReviewPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return <ReviewPageClient id={id} />
}
