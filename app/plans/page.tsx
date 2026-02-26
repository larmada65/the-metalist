import Link from "next/link";
import GlobalNav from "../../components/GlobalNav";
import { SUBSCRIPTION_LIMITS } from "../../lib/subscriptions";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "Discover and be discovered.",
    highlight: "For bands trying Metalist or using external audio hosts.",
    ctaLabel: "Start Free",
    ctaHref: "/register",
    popular: false,
  },
  {
    id: "creator",
    name: "Creator",
    price: "$3",
    priceSuffix: "/month",
    tagline: "Direct hosting for your first releases.",
    highlight: "Great for solo artists and new bands.",
    ctaLabel: "Get Creator",
    ctaHref: "/register",
    popular: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "$7",
    priceSuffix: "/month",
    tagline: "For active bands releasing regularly.",
    highlight: "Singles, demos, and live tracks every month.",
    ctaLabel: "Get Studio",
    ctaHref: "/register",
    popular: false,
  },
  {
    id: "label",
    name: "Label",
    price: "$15",
    priceSuffix: "/month",
    tagline: "For small labels and prolific bands.",
    highlight: "Multiple bands, big catalogs, more data.",
    ctaLabel: "Get Label",
    ctaHref: "/register",
    popular: false,
  },
] as const;

export default function PlansPage() {
  const freeLimits = SUBSCRIPTION_LIMITS.free;
  const creatorLimits = SUBSCRIPTION_LIMITS.creator;
  const studioLimits = SUBSCRIPTION_LIMITS.studio;
  const labelLimits = SUBSCRIPTION_LIMITS.label;

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return "No hosted audio";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB audio`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB audio`;
  };

  const formatTracks = (count: number) =>
    count === 0 ? "No direct MP3 uploads" : `${count} tracks / month`;

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/dashboard" backLabel="Back to dashboard" />

      <div className="max-w-5xl mx-auto px-6 py-16">
        <header className="mb-12 text-center md:text-left">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
            Plans
          </p>
          <h1 className="text-4xl md:text-5xl font-display uppercase tracking-tight mb-4">
            Membership <span className="text-red-500">for bands</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed">
            Discovery, rankings, reviews, and following stay free. Paid plans
            unlock direct MP3 hosting on Metalist and richer tools for your
            band. No ads, no algorithm games.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 mb-12">
          {TIERS.map((tier) => {
            const limits =
              tier.id === "free"
                ? freeLimits
                : tier.id === "creator"
                ? creatorLimits
                : tier.id === "studio"
                ? studioLimits
                : labelLimits;

            const storageLabel = formatStorage(limits.maxStorageBytes);
            const tracksLabel = formatTracks(limits.maxTracksPerMonth);
            const bandsLabel =
              limits.maxBandsWithAudio === null
                ? "All your bands"
                : `${limits.maxBandsWithAudio} band${
                    limits.maxBandsWithAudio === 1 ? "" : "s"
                  } with hosted audio`;

            return (
              <div
                key={tier.id}
                className={`border rounded-2xl p-5 flex flex-col gap-3 bg-zinc-950/60 border-zinc-800 ${
                  tier.popular
                    ? "ring-1 ring-red-600/60 border-red-600/70"
                    : ""
                }`}
              >
                {tier.popular && (
                  <p className="text-[10px] uppercase tracking-[0.18em] text-red-400 mb-1">
                    Most popular
                  </p>
                )}
                <h2 className="text-lg font-display uppercase tracking-wide">
                  {tier.name}
                </h2>
                <p className="text-xs text-zinc-500">{tier.tagline}</p>
                <div className="mt-1 mb-2">
                  <span className="text-2xl font-black">{tier.price}</span>
                  {tier.priceSuffix && (
                    <span className="text-xs text-zinc-500 ml-1">
                      {tier.priceSuffix}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mb-3">{tier.highlight}</p>
                <ul className="text-xs text-zinc-400 flex-1 space-y-1.5">
                  <li>{tracksLabel}</li>
                  <li>{storageLabel}</li>
                  <li>{bandsLabel}</li>
                  {tier.id === "free" && (
                    <li>Embed from YouTube / SoundCloud only</li>
                  )}
                  {tier.id !== "free" && (
                    <li>Includes everything in Free</li>
                  )}
                </ul>
                <Link
                  href={tier.ctaHref}
                  className={`mt-4 inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors ${
                    tier.id === "free"
                      ? "border border-zinc-700 text-zinc-200 hover:border-red-500 hover:text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {tier.ctaLabel}
                </Link>
              </div>
            );
          })}
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
                Create your band, add releases, and use embedded audio while you
                test Metalist with your fans.
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide text-xs mb-1">
                2. Upgrade to host audio
              </p>
              <p>
                When you&apos;re ready, pick a tier and upload MP3s directly to
                Metalist. Your releases keep working with embeds too.
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide text-xs mb-1">
                3. No dark patterns
              </p>
              <p>
                You can downgrade or cancel later. Rankings are driven by
                ratings and reviews, not by who pays.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600 mt-4">
            Payments and upgrades are not live yet — this page is the roadmap
            for how plans will work once billing is enabled.
          </p>
        </section>
      </div>
    </main>
  );
}

