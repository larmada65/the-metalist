import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <p className="text-8xl font-display text-zinc-900 mb-0 leading-none select-none">404</p>
      <h1 className="text-2xl font-display uppercase tracking-tight mt-4 mb-2">Page Not Found</h1>
      <p className="text-zinc-600 text-sm mb-8 text-center max-w-xs">
        This page doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">
        Back to Home
      </Link>
    </main>
  )
}
