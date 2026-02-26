import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!stripe || !supabaseAdmin || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] Missing Stripe or Supabase configuration');
    return new Response('Stripe not configured', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed', err?.message || err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const paymentId = session.metadata?.release_payment_id as string | undefined;
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        if (paymentId) {
          await supabaseAdmin
            .from('release_payments')
            .update({
              status: 'paid',
              stripe_payment_intent_id: paymentIntentId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId)
            .in('status', ['pending']);
        }
        break;
      }

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed': {
        const obj = event.data.object as any;
        const paymentId =
          obj.metadata?.release_payment_id ??
          (typeof obj.checkout_session === 'string' ? obj.checkout_session : undefined);

        if (paymentId) {
          await supabaseAdmin
            .from('release_payments')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId)
            .in('status', ['pending']);
        }
        break;
      }

      default:
        // Ignore other events for now
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] Handler error', err);
    return new Response('Webhook handler error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}

