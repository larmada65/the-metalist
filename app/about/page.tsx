import GlobalNav from "../../components/GlobalNav";
import Link from "next/link";

export const metadata = {
  title: "About — The Metalist",
  description: "Learn what The Metalist is and find our legal pages.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <GlobalNav backHref="/" backLabel="Home" />

      <div className="flex-1 px-4 py-10 md:py-16 flex justify-center">
        <section className="w-full max-w-3xl space-y-10">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              About The Metalist
            </p>
            <h1 className="text-3xl md:text-4xl font-display uppercase tracking-widest">
              Built for Metalheads
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The Metalist is an independent project focused on metal music
              discovery: a home for bands, producers, engineers, and fans to
              share releases, demos, and shows without getting lost in generic
              streaming platforms.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              It is built and run by a single developer and metal fan. This page
              exists so you know there is a real person behind the site, and so
              you can easily find our privacy policy, terms, and contact
              details.
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/privacy"
              className="group border border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-red-500/70 hover:bg-zinc-950 transition-colors"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Legal
                </p>
                <h2 className="text-sm font-bold uppercase tracking-[0.18em]">
                  Privacy Policy
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  How your account, content, and data are handled.
                </p>
              </div>
              <span className="mt-4 text-[11px] text-red-400 group-hover:text-red-300 uppercase tracking-[0.2em]">
                View →
              </span>
            </Link>

            <Link
              href="/terms"
              className="group border border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-red-500/70 hover:bg-zinc-950 transition-colors"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Legal
                </p>
                <h2 className="text-sm font-bold uppercase tracking-[0.18em]">
                  Terms of Use
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Ground rules for using The Metalist, subscriptions, and
                  content.
                </p>
              </div>
              <span className="mt-4 text-[11px] text-red-400 group-hover:text-red-300 uppercase tracking-[0.2em]">
                View →
              </span>
            </Link>

            <Link
              href="/contact"
              className="group border border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-red-500/70 hover:bg-zinc-950 transition-colors"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Support
                </p>
                <h2 className="text-sm font-bold uppercase tracking-[0.18em]">
                  Contact
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  How to reach us for questions, feedback, or issues.
                </p>
              </div>
              <span className="mt-4 text-[11px] text-red-400 group-hover:text-red-300 uppercase tracking-[0.2em]">
                View →
              </span>
            </Link>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            If you are an early tester and want to share thoughts about the
            direction of The Metalist, please{" "}
            <Link
              href="/contact"
              className="text-red-400 hover:text-red-300 underline underline-offset-4"
            >
              send a message
            </Link>
            . Honest feedback from real bands and fans is what will shape where
            this goes next.
          </p>
        </section>
      </div>
    </main>
  );
}

