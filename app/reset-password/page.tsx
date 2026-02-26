'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdate = async () => {
    setError('')
    if (!password || !confirmPassword) { setError('All fields are required.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {visible
        ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      }
    </svg>
  )

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <Link href="/" className="text-red-500 font-display tracking-widest uppercase text-2xl mb-12">
        The Metalist
      </Link>

      <div className="w-full max-w-md border border-zinc-800 rounded p-8">
        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-display uppercase tracking-wide mb-3">Password updated!</h1>
            <p className="text-zinc-400 text-sm">Redirecting you to your dashboard...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-display uppercase tracking-wide mb-2">Set new password</h1>
            <p className="text-zinc-500 text-sm mb-8">Choose something strong. 🤘</p>

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors pr-12"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors pr-12"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <EyeIcon visible={showConfirm} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleUpdate}
                disabled={loading}
                className="mt-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}