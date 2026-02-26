import Link from "next/link";
import GlobalNav from "../../components/GlobalNav";
import { UpgradeProButton } from "../../components/UpgradeProButton";
import {
  PRO_MONTHLY_PRICE_DOLLARS,
  PRICE_PER_TRACK_DOLLARS,
} from "../../lib/subscriptions";
import type { SubscriptionTier } from "../../lib/subscriptions";
import { createClient } from "../../lib/supabase-server";
import PlansReturnBanner from "./PlansReturnBanner";

const FREE_TIER = {
  id: "free",
  name: "Free",
  price: "$0",
  tagline: "Discover and be discovered.",
  highlight:
    "Create your band, add releases with YouTube or SoundCloud embeds. Rate, review, follow — no paywall.",
} as const;

const PRO_TIER = {
  id: "pro",
  name: "Pro",
  price: `$${PRO_MONTHLY_PRICE_DOLLARS}`,
  priceSuffix: "/month",
  tagline: "Release albums and songs on Metalist.",
  highlight: "Unlocks the ability to host your music directly. Then pay per release when you publish.",
  popular: true,
} as const;

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  let subscriptionTier: SubscriptionTier = "free";
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .in("status", ["trialing", "active"])
      .maybeSingle();
    const tier = sub?.tier as string | undefined;
    if (tier && tier !== "free") subscriptionTier = "pro";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/dashboard" backLabel="Back to dashboard" />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <PlansReturnBanner />
        <header className="mb-12 text-center md:text-left">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
            Plans
          </p>
          <h1 className="text-4xl md:text-5xl font-display uppercase tracking-tight mb-4">
            Membership <span className="text-red-500">for bands</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed">
            You have to be a Pro member to release albums and songs with hosted
            audio on Metalist. Pro membership costs ${PRO_MONTHLY_PRICE_DOLLARS}{" "}
            per month. Within that, releasing e.g. a 5-track EP costs{" "}
            {5 * PRICE_PER_TRACK_DOLLARS} dollars (${PRICE_PER_TRACK_DOLLARS} per
            track). Discovery, ratings, and reviews stay free for everyone.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
          {/* Free */}
          <div className="border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3 bg-zinc-950/60">
            <h2 className="text-lg font-display uppercase tracking-wide">
              {FREE_TIER.name}
            </h2>
            <p className="text-xs text-zinc-500">{FREE_TIER.tagline}</p>
            <div className="mt-1 mb-2">
              <span className="text-2xl font-black">{FREE_TIER.price}</span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">{FREE_TIER.highlight}</p>
            <ul className="text-xs text-zinc-400 flex-1 space-y-1.5">
              <li>Band profile, releases with YouTube / SoundCloud embeds</li>
              <li>No direct MP3 hosting</li>
              <li>Full discovery, ratings, reviews, feed</li>
            </ul>
            {isLoggedIn ? (
              <button
                type="button"
                disabled
                className="mt-4 inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 border border-zinc-800 text-zinc-600 cursor-default"
              >
                Current plan
              </button>
            ) : (
              <Link
                href="/register"
                className="mt-4 inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 border border-zinc-700 text-zinc-200 hover:border-red-500 hover:text-white transition-colors"
              >
                Start Free
              </Link>
            )}
          </div>

          {/* Pro */}
          <div className="border rounded-2xl p-6 flex flex-col gap-3 bg-zinc-950/60 ring-1 ring-red-600/60 border-red-600/70">
            <p className="text-[10px] uppercase tracking-[0.18em] text-red-400 mb-1">
              For bands who release music
            </p>
            <h2 className="text-lg font-display uppercase tracking-wide">
              {PRO_TIER.name}
            </h2>
            <p className="text-xs text-zinc-500">{PRO_TIER.tagline}</p>
            <div className="mt-1 mb-2">
              <span className="text-2xl font-black">{PRO_TIER.price}</span>
              {PRO_TIER.priceSuffix && (
                <span className="text-xs text-zinc-500 ml-1">
                  {PRO_TIER.priceSuffix}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mb-3">{PRO_TIER.highlight}</p>
            <ul className="text-xs text-zinc-400 flex-1 space-y-1.5">
              <li>Unlocks hosted MP3s (albums, EPs, singles)</li>
              <li>
                Pay per release when you publish — ${PRICE_PER_TRACK_DOLLARS} per
                track (e.g. 5-track EP = ${5 * PRICE_PER_TRACK_DOLLARS})
              </li>
              <li>Everything in Free included</li>
            </ul>
            <UpgradeProButton tier={subscriptionTier} isLoggedIn={isLoggedIn} />
          </div>
        </section>

        <section className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950/50">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-400">
            <div>
              <p className="font-bold uppercase tracking-wide text-xs mb-1">
                1. Start free
              </p>
              <p>
                Create your band and add releases using YouTube or SoundCloud
                links. Discover, rate, and review — no payment required.
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide text-xs mb-1">
                2. Go Pro to release music
              </p>
              <p>
                Subscribe to Pro ({PRO_MONTHLY_PRICE_DOLLARS}/month) to unlock
                the ability to release albums and songs with MP3s hosted on
                Metalist. When you publish a release, you pay per track (e.g.{" "}
                {PRICE_PER_TRACK_DOLLARS}/track, so a 5-track EP = $
                {5 * PRICE_PER_TRACK_DOLLARS}).
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide text-xs mb-1">
                3. No algorithm games
              </p>
              <p>
                Rankings are driven by ratings and reviews, not by who pays.
                You can cancel Pro anytime; your hosted releases stay up.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600 mt-4">
            Pro subscription requires STRIPE_PRO_MONTHLY_PRICE_ID in .env.local
            (create a $3/month recurring price in Stripe Dashboard). Pay-per-release
            for hosted tracks is live when you add or edit a release.
          </p>
        </section>
      </div>
    </main>
  );
}
