'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PlansReturnBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null)

  useEffect(() => {
    const upgraded = searchParams.get('upgraded')
    if (!upgraded) return
    if (upgraded === 'success') {
      setMessage({ type: 'success', text: 'Payment successful. You’re now on Pro.' })
    } else if (upgraded === 'canceled') {
      setMessage({ type: 'info', text: 'Checkout canceled. You can upgrade anytime.' })
    }
    router.replace('/plans', { scroll: false })
  }, [searchParams, router])

  if (!message) return null

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        message.type === 'success'
          ? 'border-green-800/70 bg-green-950/40 text-green-400'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-300'
      }`}
    >
      {message.text}
    </div>
  )
}
