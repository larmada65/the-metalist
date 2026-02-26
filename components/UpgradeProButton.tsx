'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { SubscriptionTier } from '../lib/subscriptions'

type Props = {
  tier: SubscriptionTier
  isLoggedIn: boolean
}

export function UpgradeProButton({ tier, isLoggedIn }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/subscribe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not start checkout.')
        setLoading(false)
        return
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }
      setError('Invalid response from server.')
    } catch {
      setError('Network error. Try again.')
    }
    setLoading(false)
  }

  if (!isLoggedIn) {
    return (
      <Link
        href="/register"
        className="mt-4 inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors"
      >
        Get Pro
      </Link>
    )
  }

  if (tier === 'pro') {
    return (
      <button
        type="button"
        disabled
        className="mt-4 inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 border border-zinc-800 text-zinc-600 cursor-default"
      >
        Current plan
      </button>
    )
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed text-white transition-colors"
      >
        {loading ? 'Redirecting to checkout…' : 'Upgrade to Pro'}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
