'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import GlobalNav from '../../../components/GlobalNav'

type Genre = { id: number; name: string }

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isProducer, setIsProducer] = useState(false)
  const [isSoundEngineer, setIsSoundEngineer] = useState(false)
  const [genreIds, setGenreIds] = useState<number[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Password fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

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
          .select('first_name, last_name, username, bio, instagram_url, twitter_url, website_url, is_producer, is_sound_engineer, genre_ids, avatar_url')
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
        setGenreIds(profile.genre_ids || [])
        setAvatarUrl(profile.avatar_url || null)
        setAvatarPreview(profile.avatar_url || null)
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
      const { data: { publicUrl } } = supabase.storage
        .from('band-logos')
        .getPublicUrl(path)
      newAvatarUrl = publicUrl
      setAvatarUrl(publicUrl)
      setAvatarFile(null)
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
        genre_ids: genreIds.length > 0 ? genreIds : null,
        avatar_url: newAvatarUrl,
      })
      .eq('id', userId)

    if (error) {
      setProfileError(
        error.code === '23505'
          ? 'That username is already taken.'
          : error.message
      )
    } else {
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }
    setSavingProfile(false)
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    if (!newPassword) return
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
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
      <GlobalNav backHref="/dashboard" backLabel="Back to dashboard" currentUser={userId} />

      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-12">
          Profile <span className="text-red-500">Settings</span>
        </h1>

        <div className="flex flex-col gap-6">

          {/* Profile info */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Profile Info</h2>
            <div className="flex flex-col gap-4">

              {/* Avatar upload */}
              <div>
                <label className={labelClass}>Profile Photo</label>
                <div className="flex items-center gap-5">
                  {/* Preview */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      : <span className="text-2xl text-zinc-600">👤</span>
                    }
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => document.getElementById('avatar-input')?.click()}
                      className="px-4 py-2 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-red-500 hover:text-white transition-colors uppercase tracking-widest w-fit">
                      {avatarPreview ? 'Change photo' : 'Upload photo'}
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => { setAvatarFile(null); setAvatarPreview(null); setAvatarUrl(null) }}
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
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className={inputClass}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className={inputClass}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="username"
                />
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={inputClass + ' resize-none'}
                  placeholder="Tell the world who you are..."
                />
                <p className="text-xs text-zinc-700 mt-1">{bio.length}/500</p>
              </div>
              <div>
                <label className={labelClass}>Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={e => setInstagramUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>
              <div>
                <label className={labelClass}>Twitter / X URL</label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={e => setTwitterUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>
              <div>
                <label className={labelClass}>Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label className={labelClass}>Roles / Skills</label>
                <p className="text-xs text-zinc-600 mb-3">
                  These tags appear next to your name so bands and artists can find you.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsProducer(v => !v)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${
                      isProducer
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}>
                    🎚 Producer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSoundEngineer(v => !v)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border ${
                      isSoundEngineer
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}>
                    🎛 Sound Engineer
                  </button>
                </div>
              </div>
              {allGenres.length > 0 && (
                <div>
                  <label className={labelClass}>Genre Preferences</label>
                  <p className="text-xs text-zinc-600 mb-3">
                    Used to filter you in musician searches and match you with relevant content.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allGenres.map(g => (
                      <button key={g.id} type="button"
                        onClick={() => setGenreIds(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
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

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className={inputClass + ' opacity-40 cursor-not-allowed'}
                />
                <p className="text-xs text-zinc-600 mt-1">Email cannot be changed here.</p>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg text-xs transition-colors"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                {profileSuccess && <p className="text-green-400 text-xs">Profile updated!</p>}
                {profileError && <p className="text-red-400 text-xs">{profileError}</p>}
              </div>
            </div>
          </div>

          {/* Change password */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Change Password</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="New password"
                />
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword || !newPassword}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg text-xs transition-colors"
                >
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
