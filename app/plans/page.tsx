import Link from "next/link";
import GlobalNav from "../../components/GlobalNav";
import {
  BEDROOM_MONTHLY_PRICE_DOLLARS,
  PRO_MONTHLY_PRICE_DOLLARS,
  PRO_PLUS_MONTHLY_PRICE_DOLLARS,
  PRICE_PER_TRACK_DOLLARS,
  normalizeTier,
} from "../../lib/subscriptions";
import type { SubscriptionTier } from "../../lib/subscriptions";
import { createClient } from "../../lib/supabase-server";
import PlansReturnBanner from "./PlansReturnBanner";
import { UpgradeButton } from "./UpgradeButton";

const FREE_TIER = {
  id: "free",
  name: "Free",
  price: "$0",
  priceSuffix: null,
  tagline: "Discover and be discovered.",
  highlight: "Band profile, releases with embeds, 1 demo per month.",
  features: [
    "Band profile & releases (YouTube / SoundCloud embeds)",
    "1 demo per month",
    "Full discovery, ratings, reviews",
    "Join bands, follow artists",
  ],
  emoji: "🎸",
} as const;

const BEDROOM_TIER = {
  id: "bedroom",
  name: "Bedroom Musician",
  price: `$${BEDROOM_MONTHLY_PRICE_DOLLARS}`,
  priceSuffix: "/month",
  tagline: "For bedroom musicians and solo artists.",
  highlight: "1 demo per week. Share rough recordings with producers.",
  features: [
    "1 demo per week",
    "Share with producers & collaborators",
    "Everything in Free",
  ],
  emoji: "🎤",
} as const;

const PRO_TIER = {
  id: "pro",
  name: "Pro",
  price: `$${PRO_MONTHLY_PRICE_DOLLARS}`,
  priceSuffix: "/month",
  tagline: "For bands who release music.",
  highlight: "Hosted MP3s. Unlimited demos. Pay $2/track when you publish.",
  features: [
    "Hosted MP3s (albums, EPs, singles)",
    `$${PRICE_PER_TRACK_DOLLARS}/track when publishing`,
    "Unlimited demos",
    "Everything in Bedroom",
  ],
  emoji: "🤘",
  popular: true,
} as const;

const PRO_PLUS_TIER = {
  id: "pro_plus",
  name: "Pro+",
  price: `$${PRO_PLUS_MONTHLY_PRICE_DOLLARS}`,
  priceSuffix: "/month",
  tagline: "The full package.",
  highlight: "Pro + lyrics on tracks, merchandise link, more coming.",
  features: [
    "Everything in Pro",
    "Lyrics on tracks",
    "Merchandise link on band page",
    "Priority support (coming soon)",
  ],
  emoji: "🔥",
} as const;

const TIERS = [FREE_TIER, BEDROOM_TIER, PRO_TIER, PRO_PLUS_TIER] as const;

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
    subscriptionTier = normalizeTier(sub?.tier as string | undefined);
  }

  const canManageSubscription =
    subscriptionTier === "bedroom" ||
    subscriptionTier === "pro" ||
    subscriptionTier === "pro_plus";

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/dashboard" backLabel="Back to dashboard" />

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <PlansReturnBanner />
        <header className="mb-12 md:mb-16 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-red-500/80 mb-3">
            Plans
          </p>
          <h1 className="text-4xl md:text-6xl font-display uppercase tracking-tight mb-4">
            Membership <span className="text-red-500">for metal</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
          {isLoggedIn && subscriptionTier !== "free" && (
            <p className="mt-3 text-sm text-zinc-600">
              Your plan: <span className="font-semibold text-zinc-400 capitalize">{subscriptionTier.replace("_", "+")}</span>
            </p>
          )}
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 mb-16">
          {TIERS.map((tier) => {
            const targetId = tier.id === "free" ? null : tier.id;
            const isPro = tier.id === "pro";
            const isFree = tier.id === "free";

            return (
              <div
                key={tier.id}
                className={`
                  relative rounded-2xl p-6 md:p-5 flex flex-col
                  border-2 transition-all
                  ${
                    isPro
                      ? "border-red-500/80 bg-red-950/30 ring-2 ring-red-500/30 shadow-lg shadow-red-950/30 scale-[1.02] md:scale-105 z-10"
                      : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700"
                  }
                `}
              >
                {'popular' in tier && tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-red-600 text-white rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{tier.emoji}</span>
                  <div>
                    <h2 className="text-lg font-display uppercase tracking-wide font-bold">
                      {tier.name}
                    </h2>
                    <p className="text-[11px] text-zinc-500">{tier.tagline}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-3xl md:text-2xl font-black tabular-nums">
                    {tier.price}
                  </span>
                  {tier.priceSuffix && (
                    <span className="text-sm text-zinc-500 ml-1">
                      {tier.priceSuffix}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mb-4">{tier.highlight}</p>
                <ul className="text-xs text-zinc-400 flex-1 space-y-2 mb-6">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500/80 shrink-0 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  isLoggedIn && subscriptionTier === "free" ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl text-xs font-bold uppercase tracking-widest px-4 py-3 border-2 border-zinc-700 bg-zinc-800/50 text-zinc-500 cursor-default"
                    >
                      Current plan
                    </button>
                  ) : !isLoggedIn ? (
                    <Link
                      href="/register"
                      className="w-full inline-flex justify-center rounded-xl text-xs font-bold uppercase tracking-widest px-4 py-3 border-2 border-zinc-600 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                    >
                      Start Free
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-600 py-2">
                      You have {subscriptionTier.replace("_", "+")}
                    </span>
                  )
                ) : (
                  <UpgradeButton
                    tier={subscriptionTier}
                    targetTier={targetId as "bedroom" | "pro" | "pro_plus"}
                    isLoggedIn={isLoggedIn}
                    label={`Upgrade to ${tier.name}`}
                    canManageSubscription={canManageSubscription}
                  />
                )}
              </div>
            );
          })}
        </section>

        <section className="border border-zinc-800 rounded-2xl p-8 md:p-10 bg-zinc-950/50">
          <h2 className="text-sm font-display uppercase tracking-wide mb-6 text-zinc-300">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <div>
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-red-600/20 text-red-400 font-black text-lg mb-3">
                1
              </span>
              <p className="font-bold uppercase tracking-wide text-xs mb-2 text-zinc-300">
                Start free
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Create your band, add releases with YouTube or SoundCloud. Upload 1 demo per month.
              </p>
            </div>
            <div>
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-red-600/20 text-red-400 font-black text-lg mb-3">
                2
              </span>
              <p className="font-bold uppercase tracking-wide text-xs mb-2 text-zinc-300">
                Upgrade when ready
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Bedroom ($3/mo) for more demos. Pro ($5/mo) for hosted releases. Pro+ ($10/mo) for lyrics and merch.
              </p>
            </div>
            <div>
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-red-600/20 text-red-400 font-black text-lg mb-3">
                3
              </span>
              <p className="font-bold uppercase tracking-wide text-xs mb-2 text-zinc-300">
                No algorithm games
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Rankings are driven by ratings. Cancel or downgrade anytime via your billing portal.
              </p>
            </div>
          </div>
        </section>

        <p className="text-[11px] text-zinc-600 mt-6 text-center">
          Stripe: STRIPE_BEDROOM_MONTHLY_PRICE_ID ($3), STRIPE_PRO_MONTHLY_PRICE_ID ($5),
          STRIPE_PRO_PLUS_MONTHLY_PRICE_ID ($10). See SUBSCRIPTIONS.md for setup.
        </p>
      </div>
    </main>
  );
}
