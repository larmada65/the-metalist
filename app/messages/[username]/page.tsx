'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'

type Message = {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  read_at: string | null
}

type Profile = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

function avatarBg(str: string): string {
  const palette = ['#7f1d1d','#78350f','#14532d','#1e3a5f','#4c1d95','#831843','#134e4a','#3b0764']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function ConversationPage() {
  const { username } = useParams() as { username: string }
  const [messages, setMessages] = useState<Message[]>([])
  const [partner, setPartner] = useState<Profile | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user.id)

      const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      if (myProfile) setMyUsername(myProfile.username)

      // Fetch partner profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .eq('username', username)
        .single()

      if (!profileData) { setNotFound(true); setLoading(false); return }
      setPartner(profileData)

      // Fetch conversation
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, content, created_at, read_at')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${profileData.id}),and(sender_id.eq.${profileData.id},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })

      if (msgs) setMessages(msgs)

      // Mark all unread messages from partner as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', profileData.id)
        .eq('recipient_id', user.id)
        .is('read_at', null)

      setLoading(false)
    }
    load()
  }, [username])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!content.trim() || !partner || !currentUser || sending) return
    setSending(true)
    const { data: newMsg } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser,
        recipient_id: partner.id,
        content: content.trim(),
      })
      .select('id, sender_id, recipient_id, content, created_at, read_at')
      .single()

    if (newMsg) {
      setMessages(prev => [...prev, newMsg])
      setContent('')
      if (myUsername) {
        await supabase.from('notifications').insert({
          user_id: partner.id,
          title: `New message from @${myUsername}`,
          body: content.trim().slice(0, 100),
          href: `/messages/${myUsername}`,
        })
      }
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-600 animate-pulse">Loading...</p>
    </main>
  )

  if (notFound) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-500">Member not found.</p>
      <Link href="/messages" className="text-red-500 hover:text-red-400 text-sm">← Back to messages</Link>
    </main>
  )

  const p = partner!
  const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <GlobalNav backHref="/messages" backLabel="Messages" />

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/messages" className="shrink-0 p-1.5 -ml-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors" title="Back to messages">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href={`/members/${p.username}`}>
            <div
              className="w-10 h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-base font-black"
              style={p.avatar_url ? {} : { backgroundColor: avatarBg(p.username) }}>
              {p.avatar_url
                ? <img src={p.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                : displayName[0]?.toUpperCase()
              }
            </div>
          </Link>
          <div>
            <Link href={`/members/${p.username}`}
              className="font-black uppercase tracking-wide text-sm hover:text-red-400 transition-colors">
              {displayName}
            </Link>
            <p className="text-xs text-zinc-600">@{p.username}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-2">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">👋</p>
              <p className="text-zinc-600 text-sm">Start a conversation with {displayName}.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === currentUser
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-red-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMine ? 'text-red-200' : 'text-zinc-500'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-6 py-4 sticky bottom-0 bg-black">
        <div className="max-w-2xl mx-auto flex gap-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${displayName}...`}
            rows={1}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition-colors resize-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-5 py-3 rounded-xl text-xs transition-colors shrink-0">
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </main>
  )
}
