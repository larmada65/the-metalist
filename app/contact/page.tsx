import GlobalNav from "../../components/GlobalNav";
import Link from "next/link";

export const metadata = {
  title: "Contact — The Metalist",
  description: "How to contact The Metalist for support or feedback.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <GlobalNav backHref="/" backLabel="Home" />

      <div className="flex-1 px-4 py-10 md:py-16 flex justify-center">
        <section className="w-full max-w-2xl space-y-8">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Support
            </p>
            <h1 className="text-3xl md:text-4xl font-display uppercase tracking-widest">
              Contact
            </h1>
            <p className="text-sm text-zinc-500">
              Questions, bug reports, feature ideas, or label inquiries — this
              is the best way to reach The Metalist.
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
                Email
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                The fastest way to get a reply is by email. I try to respond
                within 24–48 hours.
              </p>
              <a
                href="mailto:the-metalist@outlook.com"
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 underline underline-offset-4"
              >
                the-metalist@outlook.com
              </a>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
                Feedback from early users
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                If you are testing The Metalist, please be honest and specific.
                Screenshots, URLs, and short descriptions of what you were
                trying to do are extremely helpful.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              What to include
            </h2>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-inside">
              <li>Which page you were on (URL or section name)</li>
              <li>What you expected to happen vs. what actually happened</li>
              <li>Your device and browser (e.g. iPhone / Safari)</li>
              <li>Any error messages or weird behavior you noticed</li>
            </ul>
          </div>

          <footer className="border-t border-zinc-800 pt-6 mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-zinc-600">
            <p>
              Need to understand how your data is handled? Read our{" "}
              <Link
                href="/privacy"
                className="text-red-400 hover:text-red-300 uppercase tracking-[0.2em]"
              >
                Privacy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="text-red-400 hover:text-red-300 uppercase tracking-[0.2em]"
              >
                Terms
              </Link>
              .
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

