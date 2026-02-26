'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { SubscriptionTier } from '../../lib/subscriptions'
import { tierRank } from '../../lib/subscriptions'

type Props = {
  tier: SubscriptionTier
  targetTier: 'bedroom' | 'pro' | 'pro_plus'
  isLoggedIn: boolean
  label: string
  canManageSubscription?: boolean
}

export function UpgradeButton({ tier, targetTier, isLoggedIn, label, canManageSubscription }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCurrent = tier === targetTier
  const isHigher = tierRank(tier) > tierRank(targetTier)
  const isLower = tierRank(tier) < tierRank(targetTier)

  const handleUpgrade = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/subscribe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: targetTier }),
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

  const handleManageSubscription = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/subscribe/create-portal-session', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not open billing portal.')
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
        className="mt-4 inline-flex justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors"
      >
        {label}
      </Link>
    )
  }

  if (isCurrent) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled
          className="inline-flex justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 border border-zinc-700 bg-zinc-800/50 text-zinc-400 cursor-default"
        >
          Current plan
        </button>
        {canManageSubscription && (
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={loading}
            className="inline-flex justify-center rounded-lg text-[11px] font-medium uppercase tracking-widest px-4 py-2 border border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-70"
          >
            {loading ? 'Opening…' : 'Manage subscription'}
          </button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  if (isHigher) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        <span className="inline-flex justify-center rounded-lg text-[11px] font-medium uppercase tracking-widest px-4 py-2 border border-zinc-700 text-zinc-500">
          Higher plan active
        </span>
        {canManageSubscription && (
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={loading}
            className="inline-flex justify-center rounded-lg text-[11px] font-medium uppercase tracking-widest px-4 py-2 border border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-70"
          >
            {loading ? 'Opening…' : 'Downgrade or cancel'}
          </button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex justify-center rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed text-white transition-colors"
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
