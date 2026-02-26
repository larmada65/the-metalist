'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Notif = {
  id: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setNotifs(data)

      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      setLoading(false)
    }
    load()
  }, [])

  const handleMarkAllRead = async () => {
    if (!userId) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleDelete = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const handleClearAll = async () => {
    if (!userId || notifs.length === 0) return
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifs([])
  }

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav currentUser={userId} backHref="/dashboard" backLabel="Dashboard" />

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-5xl font-display uppercase tracking-tight leading-none mb-1">
              Notifications
            </h1>
            {!loading && unreadCount > 0 && (
              <p className="text-xs text-zinc-500 uppercase tracking-widest">
                {unreadCount} unread
              </p>
            )}
          </div>
          {!loading && notifs.length > 0 && (
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead}
                  className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest">
                  Mark all read
                </button>
              )}
              <button onClick={handleClearAll}
                className="text-xs text-zinc-600 hover:text-red-400 border border-zinc-800 hover:border-red-900 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex gap-4">
                <div className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse mt-1.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-4xl mb-4">🔔</p>
            <p className="text-zinc-600 uppercase tracking-widest text-sm">You're all caught up.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifs.map(notif => (
              <div key={notif.id}
                className={`border rounded-xl p-4 flex items-start gap-4 transition-colors ${
                  notif.read ? 'border-zinc-800' : 'border-zinc-700 bg-zinc-950/60'
                }`}>

                {/* Unread dot */}
                <div className="mt-1.5 shrink-0">
                  {notif.read
                    ? <div className="w-2 h-2 rounded-full bg-zinc-800" />
                    : <div className="w-2 h-2 rounded-full bg-red-500" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {notif.href ? (
                    <Link href={notif.href}
                      className="font-bold text-sm hover:text-red-400 transition-colors">
                      {notif.title}
                    </Link>
                  ) : (
                    <p className="font-bold text-sm">{notif.title}</p>
                  )}
                  {notif.body && (
                    <p className="text-xs text-zinc-500 mt-0.5">{notif.body}</p>
                  )}
                  <p className="text-xs text-zinc-700 mt-1">{timeAgo(notif.created_at)}</p>
                </div>

                {/* Dismiss */}
                <button onClick={() => handleDelete(notif.id)}
                  className="text-zinc-700 hover:text-zinc-400 transition-colors shrink-0 p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
