'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'

type Genre = { id: number; name: string }

const INSTRUMENTS = [
  'Vocals', 'Guitar', 'Bass', 'Drums', 'Keyboards',
  'Violin', 'Cello', 'Trumpet', 'Saxophone', 'Flute', 'DJ / Turntables',
]
const MUSICIAN_LEVELS = ['Just starting out', 'Intermediate', 'Advanced', 'Session / Professional']
const PRODUCTION_LEVELS = ['Home studio / Hobbyist', 'Semi-professional', 'Professional / Commercial']
const PRODUCER_AVAILABILITY = [
  { value: 'open', label: 'Open for projects' },
  { value: 'limited', label: 'Limited capacity' },
  { value: 'booked', label: 'Currently booked' },
]

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  // Core profile
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isProducer, setIsProducer] = useState(false)
  const [isSoundEngineer, setIsSoundEngineer] = useState(false)
  const [isMusician, setIsMusician] = useState(false)
  const [isFan, setIsFan] = useState(false)
  const [genreIds, setGenreIds] = useState<number[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Musician section
  const [musicianInstruments, setMusicianInstruments] = useState<string[]>([])
  const [musicianLevel, setMusicianLevel] = useState('')
  const [musicianLink, setMusicianLink] = useState('')

  // Producer / Engineer section
  const [productionLevel, setProductionLevel] = useState('')
  const [studioGear, setStudioGear] = useState('')
  const [producerSoftware, setProducerSoftware] = useState('')
  const [producerGuitarPlugins, setProducerGuitarPlugins] = useState('')
  const [producerDrumPlugins, setProducerDrumPlugins] = useState('')
  const [producerBassPlugins, setProducerBassPlugins] = useState('')
  const [producerGenreIds, setProducerGenreIds] = useState<number[]>([])
  const [producerPortfolioLinks, setProducerPortfolioLinks] = useState<{ url: string; label?: string }[]>([])
  const [producerSpecialization, setProducerSpecialization] = useState('')
  const [producerAvailability, setProducerAvailability] = useState<string>('')
  const [primaryProfile, setPrimaryProfile] = useState<string | null>(null)

  // Save / password state
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmail(user.email || '')

      const [{ data: profile }, { data: genreData }] = await Promise.all([
        supabase.from('profiles')
          .select('first_name, last_name, username, bio, instagram_url, twitter_url, website_url, is_producer, is_sound_engineer, is_musician, is_fan, genre_ids, avatar_url, musician_instruments, musician_level, musician_link, production_level, studio_gear, producer_software, producer_guitar_plugins, producer_drum_plugins, producer_bass_plugins, producer_genre_ids, producer_portfolio_links, producer_specialization, producer_availability, primary_profile')
          .eq('id', user.id).single(),
        supabase.from('genres_list').select('id, name').order('name'),
      ])

      if (profile) {
        setFirstName(profile.first_name || '')
        setLastName(profile.last_name || '')
        setUsername(profile.username || '')
        setBio(profile.bio || '')
        setInstagramUrl(profile.instagram_url || '')
        setTwitterUrl(profile.twitter_url || '')
        setWebsiteUrl(profile.website_url || '')
        setIsProducer(profile.is_producer ?? false)
        setIsSoundEngineer(profile.is_sound_engineer ?? false)
        setIsMusician(profile.is_musician ?? false)
        setIsFan(profile.is_fan ?? false)
        setGenreIds(profile.genre_ids || [])
        setAvatarUrl(profile.avatar_url || null)
        setAvatarPreview(profile.avatar_url || null)
        setMusicianInstruments(profile.musician_instruments || [])
        setMusicianLevel(profile.musician_level || '')
        setMusicianLink(profile.musician_link || '')
        setProductionLevel(profile.production_level || '')
        setStudioGear(profile.studio_gear || '')
        setProducerSoftware(profile.producer_software || '')
        setProducerGuitarPlugins(profile.producer_guitar_plugins || '')
        setProducerDrumPlugins(profile.producer_drum_plugins || '')
        setProducerBassPlugins(profile.producer_bass_plugins || '')
        setProducerGenreIds(profile.producer_genre_ids || [])
        setProducerPortfolioLinks(Array.isArray(profile.producer_portfolio_links) ? profile.producer_portfolio_links : [])
        setProducerSpecialization(profile.producer_specialization || '')
        setProducerAvailability(profile.producer_availability || '')
        setPrimaryProfile(profile.primary_profile || null)
      }
      if (genreData) setAllGenres(genreData)
      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Photo must be under 2MB.'); return }
    if (!file.type.startsWith('image/')) { setAvatarError('File must be an image.'); return }
    setAvatarError(null)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const toggleInstrument = (name: string) =>
    setMusicianInstruments(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])

  const handleSaveProfile = async () => {
    if (!userId) return
    setSavingProfile(true)
    setProfileError(null)

    let newAvatarUrl = avatarUrl
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `avatars/${userId}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('band-logos')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        setProfileError('Failed to upload photo: ' + uploadError.message)
        setSavingProfile(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('band-logos').getPublicUrl(path)
      newAvatarUrl = publicUrl
      setAvatarUrl(publicUrl)
      setAvatarFile(null)
    }

    // Enforce case-insensitive username uniqueness when changing it
    if (username.trim()) {
      const { data: existingUser, error: existingErr } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username.trim())
        .neq('id', userId)
        .maybeSingle()

      if (existingErr) {
        setProfileError('Could not check username availability. Please try again.')
        setSavingProfile(false)
        return
      }

      if (existingUser) {
        setProfileError('That username is already taken. Try a different handle or add a number.')
        setSavingProfile(false)
        return
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        is_producer: isProducer,
        is_sound_engineer: isSoundEngineer,
        is_musician: isMusician,
        is_fan: isFan,
        genre_ids: genreIds.length > 0 ? genreIds : null,
        avatar_url: newAvatarUrl,
        musician_instruments: musicianInstruments.length > 0 ? musicianInstruments : null,
        musician_level: musicianLevel || null,
        musician_link: musicianLink.trim() || null,
        production_level: productionLevel || null,
        studio_gear: studioGear.trim() || null,
        producer_software: producerSoftware.trim() || null,
        producer_guitar_plugins: producerGuitarPlugins.trim() || null,
        producer_drum_plugins: producerDrumPlugins.trim() || null,
        producer_bass_plugins: producerBassPlugins.trim() || null,
        producer_genre_ids: producerGenreIds.length > 0 ? producerGenreIds : null,
        producer_portfolio_links: (() => {
          const valid = producerPortfolioLinks.filter(l => l.url?.trim())
          return valid.length > 0 ? valid.map(l => ({ url: l.url.trim(), label: l.label?.trim() || undefined })) : null
        })(),
        producer_specialization: producerSpecialization.trim() || null,
        producer_availability: producerAvailability || null,
        primary_profile: (isProducer || isSoundEngineer) && isMusician ? (primaryProfile || 'producer') : null,
      })
      .eq('id', userId)

    if (error) {
      setProfileError(error.code === '23505' ? 'That username is already taken.' : error.message)
    } else {
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }
    setSavingProfile(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete account.')
        setDeleteLoading(false)
        return
      }
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      setDeleteError('Failed to delete account.')
    }
    setDeleteLoading(false)
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    if (!newPassword) return
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
    setSavingPassword(false)
  }

  const inputClass = 'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors text-sm'
  const labelClass = 'text-xs uppercase tracking-widest text-zinc-500 mb-2 block'

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-600 animate-pulse">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/dashboard" backLabel="Back to dashboard" />

      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="flex flex-wrap items-center gap-4 mb-12">
          <h1 className="text-4xl font-display uppercase tracking-tight">
          Profile <span className="text-red-500">Settings</span>
          </h1>
          {username && (
            <Link
              href={`/members/${username}`}
              className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white transition-colors"
            >
              View profile
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-6">

          {/* ── Core profile ───────────────────────────────────────── */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Profile Info</h2>
            <div className="flex flex-col gap-4">

              {/* Avatar */}
              <div>
                <label className={labelClass}>Profile Photo</label>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      : <span className="text-2xl text-zinc-600">👤</span>
                    }
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => document.getElementById('avatar-input')?.click()}
                      className="px-4 py-2 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-red-500 hover:text-white transition-colors uppercase tracking-widest w-fit">
                      {avatarPreview ? 'Change photo' : 'Upload photo'}
                    </button>
                    {avatarPreview && (
                      <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setAvatarUrl(null) }}
                        className="text-xs text-zinc-700 hover:text-red-400 transition-colors uppercase tracking-widest">
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-zinc-700">Square image, max 2MB</p>
                    {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
                  </div>
                </div>
                <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="First name" />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Last name" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={inputClass} placeholder="username" />
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500}
                  className={inputClass + ' resize-none'} placeholder="Tell the world who you are..." />
                <p className="text-xs text-zinc-700 mt-1">{bio.length}/500</p>
              </div>
              <div>
                <label className={labelClass}>Instagram URL</label>
                <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} className={inputClass} placeholder="https://instagram.com/yourhandle" />
              </div>
              <div>
                <label className={labelClass}>Twitter / X URL</label>
                <input type="url" value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} className={inputClass} placeholder="https://twitter.com/yourhandle" />
              </div>
              <div>
                <label className={labelClass}>Website URL</label>
                <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className={inputClass} placeholder="https://yourwebsite.com" />
              </div>

              {/* Roles */}
              <div>
                <label className={labelClass}>Roles / Skills</label>
                <p className="text-xs text-zinc-600 mb-3">Check what applies — shown on your profile.</p>
                <div className="flex gap-3 flex-wrap">
                  <button type="button" onClick={() => setIsMusician(v => !v)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${isMusician ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                    🎸 Musician
                  </button>
                  <button type="button" onClick={() => setIsProducer(v => !v)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${isProducer ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                    🎚 Producer
                  </button>
                  <button type="button" onClick={() => setIsSoundEngineer(v => !v)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${isSoundEngineer ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                    🎛 Sound Engineer
                  </button>
                  <button type="button" onClick={() => setIsFan(v => !v)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${isFan ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                    🎧 Fan
                  </button>
                </div>
                {/* Primary profile (only when both producer and musician) */}
                {(isProducer || isSoundEngineer) && isMusician && (
                  <div className="mt-5 pt-5 border-t border-zinc-800">
                    <label className={labelClass}>How should people see you?</label>
                    <p className="text-xs text-zinc-600 mb-3">
                      You&apos;ve selected both producer and musician. Choose which identity leads on your profile.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPrimaryProfile('producer')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${
                          primaryProfile === 'producer'
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        🎚 As a Producer first
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrimaryProfile('musician')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${
                          primaryProfile === 'musician'
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        🎸 As a Musician first
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Genre preferences */}
              {allGenres.length > 0 && (
                <div>
                  <label className={labelClass}>Genre Preferences</label>
                  <p className="text-xs text-zinc-600 mb-3">Used to filter you in searches and match you with relevant content.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allGenres.map(g => (
                      <button key={g.id} type="button"
                        onClick={() => setGenreIds(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${genreIds.includes(g.id) ? 'bg-red-600 text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={email} disabled className={inputClass + ' opacity-40 cursor-not-allowed'} />
                <p className="text-xs text-zinc-600 mt-1">Email cannot be changed here.</p>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button onClick={handleSaveProfile} disabled={savingProfile}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg text-xs transition-colors">
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                {profileSuccess && <p className="text-green-400 text-xs">Profile updated!</p>}
                {profileError && <p className="text-red-400 text-xs">{profileError}</p>}
              </div>
            </div>
          </div>

          {/* ── Musician ───────────────────────────────────────────── */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">As a Musician</h2>
            <p className="text-xs text-zinc-600 mb-5">Shown on your public profile. Helps bands and collaborators find you.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Instruments I play</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTS.map(inst => (
                    <button key={inst} type="button" onClick={() => toggleInstrument(inst)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        musicianInstruments.includes(inst)
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {inst}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Level</label>
                <div className="flex flex-wrap gap-2">
                  {MUSICIAN_LEVELS.map(lvl => (
                    <button key={lvl} type="button" onClick={() => setMusicianLevel(prev => prev === lvl ? '' : lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        musicianLevel === lvl
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Demo / Cover Link</label>
                <input type="url" value={musicianLink} onChange={e => setMusicianLink(e.target.value)}
                  className={inputClass} placeholder="YouTube, SoundCloud, or any URL to your playing" />
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button onClick={handleSaveProfile} disabled={savingProfile}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg text-xs transition-colors">
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
                {profileSuccess && <p className="text-green-400 text-xs">Saved!</p>}
              </div>
            </div>
          </div>

          {/* ── Producer / Engineer (conditional) ─────────────────── */}
          {(isProducer || isSoundEngineer) && (
            <div className="border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                {isProducer && isSoundEngineer ? 'Production & Engineering' : isProducer ? 'As a Producer' : 'As a Sound Engineer'}
              </h2>
              <p className="text-xs text-zinc-600 mb-5">Shown on your public profile and in the Prod/Engineers directory.</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Level</label>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCTION_LEVELS.map(lvl => (
                      <button key={lvl} type="button" onClick={() => setProductionLevel(prev => prev === lvl ? '' : lvl)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          productionLevel === lvl
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}>
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Availability</label>
                  <p className="text-xs text-zinc-600 mb-2">Let bands know if you&apos;re open for new work.</p>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCER_AVAILABILITY.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => setProducerAvailability(prev => prev === value ? '' : value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          producerAvailability === value
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Software Used</label>
                  <input type="text" value={producerSoftware} onChange={e => setProducerSoftware(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Pro Tools, Logic Pro, Reaper, Cubase..." />
                </div>
                {allGenres.length > 0 && (
                  <div>
                    <label className={labelClass}>Genres I&apos;m Open to Work On</label>
                    <p className="text-xs text-zinc-600 mb-2">Genres you&apos;re interested in producing or engineering for.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allGenres.map(g => (
                        <button key={g.id} type="button"
                          onClick={() => setProducerGenreIds(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${producerGenreIds.includes(g.id) ? 'bg-red-600 text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Specialization</label>
                  <input type="text" value={producerSpecialization} onChange={e => setProducerSpecialization(e.target.value)}
                    className={inputClass}
                    placeholder='e.g. Raw black metal, Modern death metal, Symphonic...' />
                  <p className="text-xs text-zinc-600 mt-1">Genres or styles you specialize in or love working on.</p>
                </div>
                <div>
                  <label className={labelClass}>Guitar Plugins</label>
                  <input type="text" value={producerGuitarPlugins} onChange={e => setProducerGuitarPlugins(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Neural DSP, Amplitube, Guitar Rig..." />
                </div>
                <div>
                  <label className={labelClass}>Drum Plugins</label>
                  <input type="text" value={producerDrumPlugins} onChange={e => setProducerDrumPlugins(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. EZdrummer, Superior Drummer, Addictive Drums..." />
                </div>
                <div>
                  <label className={labelClass}>Bass Plugins</label>
                  <input type="text" value={producerBassPlugins} onChange={e => setProducerBassPlugins(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Ampeg SVT sims, bass amp plugins..." />
                </div>
                <div>
                  <label className={labelClass}>Equipment & Software (general)</label>
                  <textarea value={studioGear} onChange={e => setStudioGear(e.target.value)}
                    rows={3} maxLength={500} className={inputClass + ' resize-y'}
                    placeholder="e.g. SSL console, UAD plugins, Neve 1073s, outboard gear..." />
                  <p className="text-xs text-zinc-700 mt-1">{studioGear.length}/500</p>
                </div>
                <div>
                  <label className={labelClass}>Past Work / Portfolio Links</label>
                  <p className="text-xs text-zinc-600 mb-2">YouTube, SoundCloud, or other links to projects you&apos;ve worked on.</p>
                  <div className="flex flex-col gap-2">
                    {producerPortfolioLinks.map((link, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="url" value={link.url} onChange={e => {
                          const next = [...producerPortfolioLinks]
                          next[i] = { ...link, url: e.target.value }
                          setProducerPortfolioLinks(next)
                        }} className={inputClass + ' flex-1'} placeholder="https://..." />
                        <input type="text" value={link.label || ''} onChange={e => {
                          const next = [...producerPortfolioLinks]
                          next[i] = { ...link, label: e.target.value || undefined }
                          setProducerPortfolioLinks(next)
                        }} className={inputClass + ' flex-1 min-w-0'} placeholder="Label (optional)" />
                        <button type="button" onClick={() => setProducerPortfolioLinks(prev => prev.filter((_, j) => j !== i))}
                          className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 text-xs shrink-0">
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setProducerPortfolioLinks(prev => [...prev, { url: '' }])}
                      className="px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 text-xs w-fit">
                      + Add link
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <button onClick={handleSaveProfile} disabled={savingProfile}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg text-xs transition-colors">
                    {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                  {profileSuccess && <p className="text-green-400 text-xs">Saved!</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Delete account ─────────────────────────────────────── */}
          <div className="border border-red-900/50 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-red-500/80 mb-2">Danger Zone</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder='Type DELETE to confirm'
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors text-sm placeholder-zinc-600"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== 'DELETE'}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-red-900/60 border border-red-800 text-red-300 hover:bg-red-900/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete account permanently'}
                </button>
                {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
              </div>
            </div>
          </div>

          {/* ── Change password ────────────────────────────────────── */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Change Password</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="New password" />
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Confirm new password" />
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button onClick={handleChangePassword} disabled={savingPassword || !newPassword}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg text-xs transition-colors">
                  {savingPassword ? 'Saving...' : 'Change Password'}
                </button>
                {passwordSuccess && <p className="text-green-400 text-xs">Password changed!</p>}
                {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
