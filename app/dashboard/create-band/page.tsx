'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Belgium', 'Bolivia', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Ecuador', 'Egypt',
  'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Latvia', 'Lithuania', 'Luxembourg', 'Malaysia',
  'Mexico', 'Netherlands', 'New Zealand', 'Norway', 'Pakistan', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia', 'Saudi Arabia',
  'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea',
  'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine',
  'United Kingdom', 'United States', 'Uruguay', 'Venezuela', 'Vietnam'
]

export default function CreateBand() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([])
  const [influences, setInfluences] = useState<{ id: number; name: string }[]>([])
  const [influenceSearch, setInfluenceSearch] = useState('')
  const [genreSearch, setGenreSearch] = useState('')
  const [customGenre, setCustomGenre] = useState('')

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [bandName, setBandName] = useState('')
  const [country, setCountry] = useState('')
  const [yearFormed, setYearFormed] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [youtube, setYoutube] = useState('')
  const [bandcamp, setBandcamp] = useState('')
  const [soundcloud, setSoundcloud] = useState('')
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([])
  const [selectedInfluenceIds, setSelectedInfluenceIds] = useState<number[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: g } = await supabase.from('genres_list').select('*').order('name')
      const { data: i } = await supabase.from('influences_list').select('*').order('name')
      if (g) setGenres(g)
      if (i) setInfluences(i)
    }
    load()
  }, [])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB.'); return
    }
    if (!file.type.startsWith('image/')) {
      setError('File must be an image.'); return
    }
    setError('')
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const toggleGenre = (id: number) => {
    setSelectedGenreIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleInfluence = (id: number) => {
    setSelectedInfluenceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const addCustomGenre = async () => {
    if (!customGenre.trim()) return
    const name = customGenre.trim()
    const existing = genres.find(g => g.name.toLowerCase() === name.toLowerCase())
    if (existing) { toggleGenre(existing.id); setCustomGenre(''); return }
    const { data } = await supabase
      .from('genres_list')
      .insert({ name, is_custom: true })
      .select()
      .single()
    if (data) {
      setGenres(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedGenreIds(prev => [...prev, data.id])
    }
    setCustomGenre('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!bandName.trim()) { setError('Band name is required.'); return }
    if (!logoFile) { setError('Band logo is required.'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Upload logo
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('band-logos')
      .upload(fileName, logoFile)

    if (uploadError) {
      setError('Failed to upload logo: ' + uploadError.message)
      setLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('band-logos')
      .getPublicUrl(fileName)

    // Create band
    const { data: band, error: bandError } = await supabase
      .from('bands')
      .insert({
        user_id: user.id,
        name: bandName.trim(),
        country: country || null,
        year_formed: yearFormed ? parseInt(yearFormed) : null,
        description: bio || null,
        instagram_url: instagram || null,
        facebook_url: facebook || null,
        youtube_url: youtube || null,
        bandcamp_url: bandcamp || null,
        soundcloud_url: soundcloud || null,
        genre_ids: selectedGenreIds,
        logo_url: publicUrl,
        is_published: true,
      })
      .select()
      .single()

    if (bandError || !band) {
      setError(bandError?.message || 'Something went wrong.')
      setLoading(false)
      return
    }

    // Insert creator as leader in band_members
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, first_name, last_name')
      .eq('id', user.id)
      .single()

    const fullName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.username || bandName.trim()

    await supabase.from('band_members').insert({
      band_id: band.id,
      profile_id: user.id,
      name: fullName,
      instrument: '',
      role: 'leader',
      status: 'approved',
      display_order: 0,
    })

    if (selectedInfluenceIds.length > 0) {
      await supabase.from('band_influences').insert(
        selectedInfluenceIds.map(influence_id => ({ band_id: band.id, influence_id }))
      )
    }

    router.push('/dashboard')
  }

  const filteredInfluences = influences.filter(i =>
    i.name.toLowerCase().includes(influenceSearch.toLowerCase())
  )
  const filteredGenres = genres.filter(g =>
    g.name.toLowerCase().includes(genreSearch.toLowerCase())
  )

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
  const labelClass = "text-xs uppercase tracking-widest text-zinc-500 mb-2 block"

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/dashboard" backLabel="Back to dashboard" />

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-display uppercase tracking-tight mb-2">Create Band Profile</h1>
        <p className="text-zinc-500 mb-10">Tell metalheads who you are.</p>

        {/* Step indicator */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s ? 'bg-red-600 text-white' :
                step > s ? 'bg-zinc-700 text-zinc-400' :
                'bg-zinc-900 border border-zinc-700 text-zinc-600'
              }`}>{s}</div>
              {s < 3 && <div className={`w-16 h-px ${step > s ? 'bg-zinc-700' : 'bg-zinc-800'}`} />}
            </div>
          ))}
          <div className="ml-4 text-sm text-zinc-500 self-center">
            {step === 1 ? 'The Basics' : step === 2 ? 'Your Story' : 'Your Sound'}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            {/* Logo upload */}
            <div>
              <label className={labelClass}>Band Logo <span className="text-red-500">*</span></label>
              <p className="text-zinc-600 text-xs mb-3">Required. Square image recommended. Max 2MB.</p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  logoPreview ? 'border-zinc-700' : 'border-zinc-700 hover:border-red-500'
                }`}
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={logoPreview} alt="Logo preview" className="w-32 h-32 object-contain rounded" />
                    <p className="text-xs text-zinc-500">Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-zinc-600">
                    <span className="text-4xl">🖼️</span>
                    <p className="text-sm">Click to upload your band logo</p>
                    <p className="text-xs">PNG, JPG, WEBP supported</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>

            <div>
              <label className={labelClass}>Band Name <span className="text-red-500">*</span></label>
              <input type="text" value={bandName} onChange={e => setBandName(e.target.value)}
                className={inputClass} placeholder="Your band name" />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                className={inputClass + ' cursor-pointer'}>
                <option value="">Select country...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year Formed</label>
              <input type="number" value={yearFormed} onChange={e => setYearFormed(e.target.value)}
                className={inputClass} placeholder="e.g. 2018" min="1950" max={new Date().getFullYear()} />
            </div>
            <div>
              <label className={labelClass}>Genres</label>
              <input type="text" value={genreSearch} onChange={e => setGenreSearch(e.target.value)}
                className={inputClass + ' mb-3'} placeholder="Search genres..." />
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {filteredGenres.map(g => (
                  <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      selectedGenreIds.includes(g.id)
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}>
                    {g.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input type="text" value={customGenre} onChange={e => setCustomGenre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomGenre()}
                  className={inputClass} placeholder="Add custom genre..." />
                <button type="button" onClick={addCustomGenre}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded transition-colors text-sm font-bold">
                  Add
                </button>
              </div>
            </div>
            <button onClick={() => {
              if (!logoFile) { setError('Band logo is required.'); return }
              if (!bandName.trim()) { setError('Band name is required.'); return }
              setError(''); setStep(2)
            }}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors">
              Next →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <label className={labelClass}>Bio / Description</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                className={inputClass + ' min-h-32 resize-y'} placeholder="Tell the world about your band..." />
            </div>
            <div>
              <label className={labelClass}>Instagram URL</label>
              <input type="url" value={instagram} onChange={e => setInstagram(e.target.value)}
                className={inputClass} placeholder="https://instagram.com/yourband" />
            </div>
            <div>
              <label className={labelClass}>Facebook URL</label>
              <input type="url" value={facebook} onChange={e => setFacebook(e.target.value)}
                className={inputClass} placeholder="https://facebook.com/yourband" />
            </div>
            <div>
              <label className={labelClass}>YouTube URL</label>
              <input type="url" value={youtube} onChange={e => setYoutube(e.target.value)}
                className={inputClass} placeholder="https://youtube.com/@yourband" />
            </div>
            <div>
              <label className={labelClass}>Bandcamp URL</label>
              <input type="url" value={bandcamp} onChange={e => setBandcamp(e.target.value)}
                className={inputClass} placeholder="https://yourband.bandcamp.com" />
            </div>
            <div>
              <label className={labelClass}>SoundCloud URL</label>
              <input type="url" value={soundcloud} onChange={e => setSoundcloud(e.target.value)}
                className={inputClass} placeholder="https://soundcloud.com/yourband" />
            </div>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-zinc-700 text-zinc-300 font-bold uppercase tracking-widest py-3 rounded hover:border-white hover:text-white transition-colors">
                ← Back
              </button>
              <button onClick={() => { setError(''); setStep(3) }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <label className={labelClass}>Influences</label>
              <p className="text-zinc-600 text-xs mb-3">Select all bands that influenced your sound. This is how fans will discover you.</p>
              <input type="text" value={influenceSearch} onChange={e => setInfluenceSearch(e.target.value)}
                className={inputClass + ' mb-3'} placeholder="Search influences..." />
              {selectedInfluenceIds.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Selected ({selectedInfluenceIds.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInfluenceIds.map(id => {
                      const inf = influences.find(i => i.id === id)
                      return inf ? (
                        <button key={id} type="button" onClick={() => toggleInfluence(id)}
                          className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                          {inf.name} ✕
                        </button>
                      ) : null
                    })}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto border border-zinc-800 rounded p-3">
                {filteredInfluences.filter(i => !selectedInfluenceIds.includes(i.id)).map(i => (
                  <button key={i.id} type="button" onClick={() => toggleInfluence(i.id)}
                    className="px-3 py-1.5 rounded text-sm font-medium bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white transition-colors">
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setStep(2)}
                className="flex-1 border border-zinc-700 text-zinc-300 font-bold uppercase tracking-widest py-3 rounded hover:border-white hover:text-white transition-colors">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors">
                {loading ? 'Creating...' : '🤘 Launch Band'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
