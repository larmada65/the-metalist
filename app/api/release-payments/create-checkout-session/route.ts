import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { stripe } from '../../../../lib/stripe';
import { PRICE_PER_TRACK_DOLLARS } from '../../../../lib/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  releaseId: string;
  bandId: string;
  hostedTrackCount: number;
};

export async function POST(req: NextRequest) {
  // Beta mode: optionally disable payments entirely so hosted tracks are free.
  // When NEXT_PUBLIC_DISABLE_PAYMENTS === 'true', we short-circuit and pretend
  // everything is already paid. Useful for early testing / closed betas.
  if (process.env.NEXT_PUBLIC_DISABLE_PAYMENTS === 'true') {
    return NextResponse.json({
      checkoutUrl: null,
      alreadyPaid: 0,
      newBillable: 0,
      amountCents: 0,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const missing: string[] = []
  if (!stripe) missing.push('STRIPE_SECRET_KEY')
  if (!appUrl) missing.push('NEXT_PUBLIC_APP_URL')
  if (missing.length > 0 || !stripe) {
    const error =
      'Payments are not configured. Missing: ' +
      (missing.length > 0 ? missing.join(', ') : 'STRIPE_SECRET_KEY or NEXT_PUBLIC_APP_URL') +
      '. Add them to .env.local in the project root and restart the dev server (see PAYMENTS.md).'
    return NextResponse.json({ error }, { status: 500 })
  }

  const stripeClient = stripe as NonNullable<typeof stripe>

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { releaseId, bandId, hostedTrackCount } = body;

  if (!releaseId || !bandId || typeof hostedTrackCount !== 'number' || hostedTrackCount <= 0) {
    return NextResponse.json(
      { error: 'releaseId, bandId, and hostedTrackCount (> 0) are required.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Confirm the user can manage this band (leader).
  const { data: membership } = await supabase
    .from('band_members')
    .select('role')
    .eq('band_id', bandId)
    .eq('profile_id', user.id)
    .eq('status', 'approved')
    .maybeSingle();

  if (!membership || membership.role !== 'leader') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // How many hosted tracks have already been paid for this release?
  const { data: existingPayments, error: paymentsError } = await supabase
    .from('release_payments')
    .select('hosted_tracks_paid, status')
    .eq('release_id', releaseId)
    .eq('user_id', user.id);

  if (paymentsError) {
    console.error('[payments] Failed to load existing payments', paymentsError);
    const isDev = process.env.NODE_ENV !== 'production';
    const hint = isDev && paymentsError.message
      ? ` ${paymentsError.message} (If "release_payments" is missing, run the migration in supabase-migrations/002_release_payments.sql in the Supabase SQL Editor.)`
      : ' If this persists, ensure the release_payments table exists (run the migration in supabase-migrations/002_release_payments.sql).';
    return NextResponse.json(
      { error: 'Could not compute payment status.' + hint },
      { status: 500 }
    );
  }

  const alreadyPaid =
    existingPayments?.filter((p) => p.status === 'paid').reduce((sum, p) => sum + (p.hosted_tracks_paid ?? 0), 0) ?? 0;

  const newBillable = Math.max(0, hostedTrackCount - alreadyPaid);

  if (newBillable <= 0) {
    return NextResponse.json({
      checkoutUrl: null,
      alreadyPaid,
      newBillable: 0,
      amountCents: 0,
    });
  }

  const amountCents = newBillable * PRICE_PER_TRACK_DOLLARS * 100;

  const { data: inserted, error: insertError } = await supabase
    .from('release_payments')
    .insert({
      release_id: releaseId,
      band_id: bandId,
      user_id: user.id,
      hosted_tracks_paid: newBillable,
      amount_cents: amountCents,
      currency: 'usd',
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('[payments] Failed to insert release_payments row', insertError);
    return NextResponse.json({ error: 'Could not start payment.' }, { status: 500 });
  }

  const paymentId: string = inserted.id;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/+$/, '');

  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `Hosted tracks on The Metalist`,
            description: `${newBillable} hosted track${newBillable === 1 ? '' : 's'} for this release`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      release_payment_id: paymentId,
      release_id: releaseId,
      band_id: bandId,
      user_id: user.id,
      hosted_tracks_paid: String(newBillable),
    },
    success_url: `${baseUrl}/dashboard/manage/${bandId}?releasePayment=success`,
    cancel_url: `${baseUrl}/dashboard/manage/${bandId}?releasePayment=canceled`,
  });

  // Persist Stripe identifiers for later reconciliation.
  if (session.id) {
    await supabase
      .from('release_payments')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
      })
      .eq('id', paymentId);
  }

  return NextResponse.json({
    checkoutUrl: session.url,
    alreadyPaid,
    newBillable,
    amountCents,
  });
}

