import GlobalNav from "../../components/GlobalNav";
import Link from "next/link";

export const metadata = {
  title: "Terms of Use — The Metalist",
  description: "Ground rules for using The Metalist.",
};

export default function TermsPage() {
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
              Terms of Use
            </h1>
            <p className="text-sm text-zinc-500">
              These terms describe what you can expect from The Metalist and
              what we expect from you when you use the site.
            </p>
            <p className="text-xs text-zinc-600">
              Last updated: {new Date().toISOString().split("T")[0]}
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              1. Your account
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              You are responsible for your account and for keeping your login
              details secure. Do not share your password with others. If you
              think your account has been compromised, please change your
              password and contact us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              2. Content you upload
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              You keep ownership of the music, artwork, and other content you
              upload to The Metalist. By uploading it, you grant us a
              non‑exclusive license to store, display, and distribute it through
              the site so that the service can work as intended.
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              You promise that you have the rights needed to upload and share
              this content and that it does not infringe anyone else&apos;s
              rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              3. Acceptable use
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The Metalist is for metal music discovery and collaboration. You
              agree not to use the site to:
            </p>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-inside">
              <li>harass, threaten, or abuse other people,</li>
              <li>share illegal, hateful, or violent content,</li>
              <li>
                upload content that you do not have the rights to share, or
              </li>
              <li>
                attack the service or attempt to access data that does not
                belong to you.
              </li>
            </ul>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We may remove content or suspend accounts that break these rules
              or create risk for other users or for the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              4. Subscriptions and payments
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Paid plans are billed through Stripe on a recurring basis as
              described on the{" "}
              <Link
                href="/plans"
                className="text-red-400 hover:text-red-300 underline underline-offset-4"
              >
                Plans
              </Link>{" "}
              page. You can cancel at any time from your account portal; when
              you cancel, you keep access until the end of the current billing
              period.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              5. Availability and changes
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We aim to keep The Metalist fast and reliable, but we cannot
              guarantee zero downtime or that the service will always be
              available in its current form. We may change features, pricing, or
              these terms over time. When we make important changes, we will
              update this page and, where appropriate, let you know in the app
              or by email.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              6. Disclaimer
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The Metalist is provided “as is” without any guarantees. To the
              extent allowed by law, we are not liable for indirect or
              consequential damages, lost profits, or loss of data that may
              result from using the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              7. Contact
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              If you have questions about these terms, please email{" "}
              <a
                href="mailto:the-metalist@outlook.com"
                className="text-red-400 hover:text-red-300 underline underline-offset-4"
              >
                the-metalist@outlook.com
              </a>
              .
            </p>
          </section>

          <footer className="border-t border-zinc-800 pt-6 mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-zinc-600">
            <p>
              By using The Metalist you agree to these terms. If you do not
              agree, please do not use the service.
            </p>
            <div className="flex gap-4">
              <Link
                href="/privacy"
                className="hover:text-red-400 uppercase tracking-[0.2em]"
              >
                Privacy
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

