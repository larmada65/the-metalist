'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleReset = async () => {
    setError('')
    if (!email) { setError('Please enter your email.'); return }
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/reset-password',
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <Link href="/" className="text-red-500 font-display tracking-widest uppercase text-2xl mb-12">
        The Metalist
      </Link>

      <div className="w-full max-w-md border border-zinc-800 rounded p-8">
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <h1 className="text-2xl font-display uppercase tracking-wide mb-3">Check your inbox</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We sent a password reset link to <span className="text-white">{email}</span>. Click the link in the email to set a new password.
            </p>
            <Link href="/login" className="inline-block mt-8 text-red-500 hover:text-red-400 text-sm">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-display uppercase tracking-wide mb-2">Forgot password?</h1>
            <p className="text-zinc-500 text-sm mb-8">Enter your email and we'll send you a reset link.</p>

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading}
                className="mt-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <p className="text-zinc-600 text-sm text-center mt-6">
              Remembered it?{' '}
              <Link href="/login" className="text-red-500 hover:text-red-400">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}