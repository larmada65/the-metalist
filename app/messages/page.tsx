'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../components/GlobalNav'

type Conversation = {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  lastMessage: string
  lastAt: string
  unreadCount: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function avatarBg(str: string): string {
  const palette = ['#7f1d1d','#78350f','#14532d','#1e3a5f','#4c1d95','#831843','#134e4a','#3b0764']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user.id)

      // Fetch all messages involving current user
      const { data: messages } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, content, created_at, read_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!messages || messages.length === 0) { setLoading(false); return }

      // Group by conversation partner
      const partnerIds = new Set<string>()
      messages.forEach((m: any) => {
        const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id
        partnerIds.add(partnerId)
      })

      // Fetch partner profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .in('id', [...partnerIds])

      const profileMap: Record<string, any> = {}
      profiles?.forEach((p: any) => { profileMap[p.id] = p })

      // Build conversations
      const convMap: Record<string, Conversation> = {}
      messages.forEach((m: any) => {
        const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id
        if (convMap[partnerId]) return // already have the latest message
        const p = profileMap[partnerId]
        if (!p) return
        const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
        convMap[partnerId] = {
          userId: partnerId,
          username: p.username,
          displayName,
          avatarUrl: p.avatar_url,
          lastMessage: m.content,
          lastAt: m.created_at,
          unreadCount: 0,
        }
      })

      // Count unread messages (received and not read)
      messages.forEach((m: any) => {
        if (m.recipient_id === user.id && !m.read_at) {
          const partnerId = m.sender_id
          if (convMap[partnerId]) convMap[partnerId].unreadCount++
        }
      })

      setConversations(Object.values(convMap).sort((a, b) =>
        new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
      ))
      setLoading(false)
    }
    load()
  }, [])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav />

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-5xl font-display uppercase tracking-tight mb-2">Messages</h1>
          <p className="text-zinc-600 text-sm">
            {totalUnread > 0
              ? `${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`
              : 'Direct messages with other members.'}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-20 text-center">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-zinc-400 font-black uppercase tracking-wide mb-2">No messages yet</p>
            <p className="text-zinc-600 text-sm mb-8 max-w-xs mx-auto">
              Send a message to another member from their profile page.
            </p>
            <Link href="/members"
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">
              Browse Members
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map(conv => (
              <Link key={conv.userId} href={`/messages/${conv.username}`}
                className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group">
                <div
                  className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-lg font-black"
                  style={conv.avatarUrl ? {} : { backgroundColor: avatarBg(conv.username) }}>
                  {conv.avatarUrl
                    ? <img src={conv.avatarUrl} alt={conv.displayName} className="w-full h-full object-cover" />
                    : conv.displayName[0]?.toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black uppercase tracking-wide text-sm group-hover:text-red-500 transition-colors">
                      {conv.displayName}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">@{conv.username}</p>
                  <p className={`text-xs mt-0.5 truncate ${conv.unreadCount > 0 ? 'text-zinc-300 font-medium' : 'text-zinc-600'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
                <p className="text-xs text-zinc-700 shrink-0">{timeAgo(conv.lastAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
