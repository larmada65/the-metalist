import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase-server'
import { stripe } from '../../../../lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')
  if (!stripe || !baseUrl) {
    return NextResponse.json(
      { error: 'Server not configured.', hint: 'Set NEXT_PUBLIC_APP_URL in .env.local' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'You must be logged in to manage your subscription.' }, { status: 401 })
  }

  try {
    const customers = await stripe!.customers.list({
      email: user.email,
      limit: 1,
    })

    const customerId = customers.data[0]?.id
    if (!customerId) {
      return NextResponse.json(
        {
          error: 'No billing account found.',
          hint: 'Subscribe to a plan first. Your Stripe billing record is created when you complete checkout.',
        },
        { status: 400 }
      )
    }

    const session = await stripe!.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/plans`,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Could not create billing portal session.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[subscribe] Portal session error:', msg)
    return NextResponse.json(
      { error: 'Could not open billing portal.', hint: msg },
      { status: 500 }
    )
  }
}
