import Link from 'next/link'

interface PageNavProps {
  backHref: string
  backLabel: string
  username?: string
  onLogout?: () => void
}

export default function PageNav({ backHref, backLabel, username, onLogout }: PageNavProps) {
  return (
    <nav className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
      <div className="flex flex-col">
        <Link href="/" className="text-xl font-black tracking-widest uppercase text-red-500 leading-tight">
          The Metalist
        </Link>
        <Link href={backHref} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-0.5">
          ← {backLabel}
        </Link>
      </div>
      {username && (
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-sm">
            Hey, <span className="text-white font-bold">{username}</span> 🤘
          </span>
          {onLogout && (
            <button onClick={onLogout}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest">
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
