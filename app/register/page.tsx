'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import GlobalNav from '../../components/GlobalNav'

type Genre = { id: number; name: string }

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [genreIds, setGenreIds] = useState<number[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('genres_list').select('id, name').order('name').then(({ data }) => {
      if (data) setAllGenres(data)
    })
  }, [])

  const toggleGenre = (id: number) =>
    setGenreIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleRegister = async () => {
    setError('')
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      setError('All fields are required.'); return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.'); return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); return
    }
    setLoading(true)

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (existing) {
      setError('Username already taken.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // upsert handles both: fresh signup and any auto-created row from a DB trigger
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      }, { onConflict: 'id' })

      if (profileError) {
        // Most likely cause: email confirmation is on and auth.uid() isn't set yet.
        // Store the profile data in localStorage so we can save it after confirmation.
        localStorage.setItem('pending_profile', JSON.stringify({
          id: data.user.id, username, email,
          first_name: firstName.trim(), last_name: lastName.trim(),
        }))
      }
    }

    // If Supabase requires email confirmation, session is null — show a message instead of redirecting
    if (!data.session) {
      setEmailSent(true)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {visible
        ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      }
    </svg>
  )

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <GlobalNav backHref="/" backLabel="Home" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <Link href="/" className="text-red-500 font-black tracking-widest uppercase text-2xl mb-12">
          The Metalist
        </Link>

        {emailSent ? (
        <div className="w-full max-w-md border border-zinc-800 rounded p-8 text-center">
          <p className="text-4xl mb-4">📬</p>
          <h2 className="text-xl font-black uppercase tracking-wide mb-2">Check your email</h2>
          <p className="text-zinc-400 text-sm mb-6">
            We sent a confirmation link to <span className="text-white font-bold">{email}</span>.
            Click it to activate your account, then come back and log in.
          </p>
          <Link href="/login" className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded text-sm transition-colors">
            Go to Login
          </Link>
        </div>
      ) : (
      <div className="w-full max-w-md border border-zinc-800 rounded p-8">
          <h1 className="text-2xl font-black uppercase tracking-wide mb-2">Join the underground</h1>
          <p className="text-zinc-500 text-sm mb-8">Create your account. It's free.</p>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  className={inputClass} placeholder="John" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  className={inputClass} placeholder="Doe" />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Username</label>
              <input type="text" value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                className={inputClass} placeholder="your_username" />
              <p className="text-xs text-zinc-600 mt-1">This is your public handle on the platform.</p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="you@example.com" />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass + ' pr-12'} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={inputClass + ' pr-12'} placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <EyeIcon visible={showConfirm} />
                </button>
              </div>
            </div>

            <button onClick={handleRegister} disabled={loading}
              className="mt-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <p className="text-zinc-600 text-sm text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-red-500 hover:text-red-400">Login</Link>
          </p>
        </div>
      )}
      </div>
    </main>
  )
}
