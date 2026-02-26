import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase-server'
import { stripe } from '../../../../lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BEDROOM_PRICE_ID = process.env.STRIPE_BEDROOM_MONTHLY_PRICE_ID?.trim()
const PRO_PRICE_ID = process.env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim()
const PRO_PLUS_PRICE_ID = process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID?.trim()

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')
  if (!stripe || !baseUrl) {
    return NextResponse.json(
      { error: 'Server not configured.', hint: 'Set NEXT_PUBLIC_APP_URL in .env.local' },
      { status: 500 }
    )
  }

  let body: { tier?: string } = {}
  try {
    body = await req.json()
  } catch {}
  const tier = (body.tier as string) || 'pro'

  const priceId =
    tier === 'bedroom' ? BEDROOM_PRICE_ID
    : tier === 'pro_plus' ? PRO_PLUS_PRICE_ID
    : PRO_PRICE_ID

  if (!priceId) {
    return NextResponse.json(
      {
        error: `Subscription tier "${tier}" is not configured.`,
        hint: `Set STRIPE_${tier === 'bedroom' ? 'BEDROOM' : tier === 'pro_plus' ? 'PRO_PLUS' : 'PRO'}_MONTHLY_PRICE_ID in .env.local`,
      },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to upgrade.' }, { status: 401 })
  }

  try {
    const session = await stripe!.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      success_url: `${baseUrl}/plans?upgraded=success`,
      cancel_url: `${baseUrl}/plans?upgraded=canceled`,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Could not create checkout session. Stripe did not return a URL.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[subscribe] Stripe checkout error:', err?.message ?? err)
    const msg = err?.message ?? 'Unknown Stripe error'
    return NextResponse.json(
      {
        error: 'Could not start checkout.',
        hint: msg,
      },
      { status: 500 }
    )
  }
}
