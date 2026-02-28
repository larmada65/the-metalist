import Link from 'next/link'
import GlobalNav from '../components/GlobalNav'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/" backLabel="Home" />
      <div className="max-w-xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        <p className="text-8xl font-display text-zinc-900 mb-0 leading-none select-none">404</p>
        <h1 className="text-2xl font-display uppercase tracking-tight mt-4 mb-2">
          This band left the stage…
        </h1>
        <p className="text-zinc-600 text-sm mb-8 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Try heading back
          home or exploring more bands.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            Home
          </Link>
          <Link
            href="/explore"
            className="px-6 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            Explore Bands
          </Link>
        </div>
      </div>
    </main>
  )
}
