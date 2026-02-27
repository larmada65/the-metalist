'use client'

import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-7xl font-display text-zinc-900 mb-0 leading-none select-none">500</p>
        <h1 className="text-2xl font-display uppercase tracking-tight mt-4 mb-2">
          Something broke backstage
        </h1>
        <p className="text-zinc-600 text-sm mb-6 max-w-sm">
          An unexpected error happened while loading this page. If this keeps happening, please email{' '}
          <a
            href="mailto:the-metalist@outlook.com"
            className="text-red-400 hover:text-red-300 underline underline-offset-4"
          >
            the-metalist@outlook.com
          </a>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-4 text-[10px] text-zinc-700 max-w-md break-words">
            {error.message}
          </p>
        )}
      </body>
    </html>
  )
}

