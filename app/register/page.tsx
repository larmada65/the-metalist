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
  const [isProducer, setIsProducer] = useState(false)
  const [isSoundEngineer, setIsSoundEngineer] = useState(false)
  const [isMusician, setIsMusician] = useState(false)
  const [isFan, setIsFan] = useState(false)
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
    if (!isProducer && !isSoundEngineer && !isMusician && !isFan) {
      setError('Please choose at least one role: Producer, Sound Engineer, Musician, or Fan.')
      return
    }
    setLoading(true)

    // Case-insensitive username uniqueness check
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle()

    if (existingError) {
      setError('Could not check username availability. Please try again.')
      setLoading(false)
      return
    }

    if (existing) {
      setError('Username already taken. Try a different handle or add a number.');
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      // Friendlier message when the email is already in use
      if (signUpError.message.toLowerCase().includes('user already registered')) {
        setError('There is already an account with that email. Try logging in instead.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    if (data.user) {
      const profilePayload = {
        id: data.user.id,
        username,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        genre_ids: genreIds.length > 0 ? genreIds : null,
        is_producer: isProducer,
        is_sound_engineer: isSoundEngineer,
        is_musician: isMusician,
        is_fan: isFan,
      }
      const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })

      if (profileError) {
        localStorage.setItem('pending_profile', JSON.stringify(profilePayload))
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
        <Link href="/" className="text-red-500 font-display tracking-widest uppercase text-2xl mb-12">
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
          <h1 className="text-2xl font-display uppercase tracking-wide mb-2">Join Metalist</h1>
          <p className="text-zinc-500 text-sm mb-3">Create your account and start discovering new metal.</p>
          <p className="text-zinc-600 text-xs mb-6">
            Bands can keep using YouTube or SoundCloud embeds for free. To release albums
            and songs with hosted MP3s, you need a Pro membership — see the{" "}
            <Link href="/plans" className="text-red-500 hover:text-red-400 underline underline-offset-2">
              plans page
            </Link>.
          </p>

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

            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-1 block">
                I am a… <span className="text-zinc-700 normal-case tracking-normal">(required — select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={() => setIsMusician(v => !v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                    isMusician ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}>
                  🎸 Musician
                </button>
                <button type="button" onClick={() => setIsProducer(v => !v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                    isProducer ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}>
                  🎚 Producer
                </button>
                <button type="button" onClick={() => setIsSoundEngineer(v => !v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                    isSoundEngineer ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}>
                  🔊 Sound Engineer
                </button>
                <button type="button" onClick={() => setIsFan(v => !v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                    isFan ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}>
                  🎧 Fan
                </button>
              </div>
            </div>

            {allGenres.length > 0 && (
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 mb-1 block">
                  Your Taste <span className="text-zinc-700 normal-case tracking-normal">(optional — helps with filtering)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allGenres.map(g => (
                    <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        genreIds.includes(g.id)
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
