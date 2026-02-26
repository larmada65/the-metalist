import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase-server'
import { stripe } from '../../../../lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRO_PRICE_ID = process.env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim()

export async function POST(req: NextRequest) {
  if (!stripe || !PRO_PRICE_ID || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json(
      {
        error: 'Pro subscription is not configured.',
        hint: 'Set STRIPE_PRO_MONTHLY_PRICE_ID and NEXT_PUBLIC_APP_URL in .env.local. Create a $3/month recurring price in Stripe Dashboard.',
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')

  try {
    const session = await stripe!.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRO_PRICE_ID,
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
