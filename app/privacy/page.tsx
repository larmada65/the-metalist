import GlobalNav from "../../components/GlobalNav";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — The Metalist",
  description: "How The Metalist handles your data, accounts, and content.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <GlobalNav backHref="/" backLabel="Home" />

      <div className="flex-1 px-4 py-10 md:py-16 flex justify-center">
        <article className="w-full max-w-3xl space-y-8">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Legal
            </p>
            <h1 className="text-3xl md:text-4xl font-display uppercase tracking-widest">
              Privacy Policy
            </h1>
            <p className="text-sm text-zinc-500">
              This page explains what information The Metalist collects, how it
              is used, and the choices you have. It is written in plain
              language so you know what is going on.
            </p>
            <p className="text-xs text-zinc-600">
              Last updated: {new Date().toISOString().split("T")[0]}
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              1. Who we are
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The Metalist is a passion project built to help metal bands and
              fans discover each other, share releases and demos, and follow
              the scene. If you have questions about this policy, you can reach
              us at{" "}
              <a
                href="mailto:the-metalist@outlook.com"
                className="text-red-400 hover:text-red-300 underline underline-offset-4"
              >
                the-metalist@outlook.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              2. What we collect
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We only collect information we need to run the service:
            </p>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-inside">
              <li>
                <strong className="font-semibold">Account details</strong> –
                email address, username, password (stored by Supabase using
                secure hashing), and basic profile fields you choose to share.
              </li>
              <li>
                <strong className="font-semibold">Content you upload</strong> –
                band profiles, releases, tracks, lyrics, demos, reviews,
                ratings, and messages.
              </li>
              <li>
                <strong className="font-semibold">Usage data</strong> – basic
                logs from our hosting provider (e.g. IP address, browser,
                device) to keep the site secure and understand how it is used.
              </li>
              <li>
                <strong className="font-semibold">Payment data</strong> – when
                you subscribe, payments are processed by Stripe. We do not see
                or store your full card number. We receive basic subscription
                details (plan, status, renewal dates).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              3. How we use your information
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We use your data to:
            </p>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-inside">
              <li>create and maintain your account on The Metalist,</li>
              <li>show your bands, releases, demos, and reviews to others,</li>
              <li>run subscriptions and payments through Stripe,</li>
              <li>
                send you essential emails (login, security, billing, important
                product updates),
              </li>
              <li>
                keep the site secure and prevent abuse (e.g. spam, fraud,
                attacks).
              </li>
            </ul>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We do <span className="font-semibold">not</span> sell your data
              to anyone.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              4. Where your data lives
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The Metalist uses{" "}
              <span className="font-semibold">Supabase</span> for databases and
              authentication, and <span className="font-semibold">Stripe</span>{" "}
              for billing. Your data is stored on their infrastructure and is
              subject to their security practices as well as this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              5. How long we keep things
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We keep your account and content for as long as you have an
              account on The Metalist, unless you ask us to delete it or we are
              required to remove it for legal or moderation reasons.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              6. Your choices
            </h2>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-inside">
              <li>
                <strong className="font-semibold">Update your profile</strong>{" "}
                – you can change your profile information and band data at any
                time from your dashboard.
              </li>
              <li>
                <strong className="font-semibold">Unsubscribe from emails</strong>{" "}
                – for non-essential emails, you can opt out using links in the
                message, if/when they are added.
              </li>
              <li>
                <strong className="font-semibold">Delete your account</strong>{" "}
                – you can request deletion from the account settings page (or
                by emailing us) and we will remove or anonymise your personal
                data where reasonably possible.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              7. Changes to this policy
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              If we make material changes to this policy, we will update the
              date at the top and, where appropriate, let you know inside the
              app or by email. If you keep using The Metalist after changes go
              live, that means you agree to the updated policy.
            </p>
          </section>

          <footer className="border-t border-zinc-800 pt-6 mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-zinc-600">
            <p>
              Built for metalheads. If you have privacy questions, email{" "}
              <a
                href="mailto:the-metalist@outlook.com"
                className="text-red-400 hover:text-red-300"
              >
                the-metalist@outlook.com
              </a>
              .
            </p>
            <div className="flex gap-4">
              <Link
                href="/terms"
                className="hover:text-red-400 uppercase tracking-[0.2em]"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="hover:text-red-400 uppercase tracking-[0.2em]"
              >
                Contact
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}

