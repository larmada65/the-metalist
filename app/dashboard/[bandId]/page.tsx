'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'
import { createClient } from '../../../lib/supabase'
import { uploadViaApi } from '../../../lib/storage-upload-client'

type Band = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  band_pic_url: string | null
  country: string | null
  year_formed: number | null
  description: string | null
  genre_ids: number[] | null
  instagram_url: string | null
  facebook_url: string | null
  youtube_url: string | null
  bandcamp_url: string | null
  soundcloud_url: string | null
}

type Release = {
  id: string
  title: string
  release_type: string
  release_year: number | null
  cover_url: string | null
}

type Member = {
  id?: string
  name: string
  instruments: string[]
  primary_instrument: string
  join_year: string
  country: string
  profile_id?: string
  status?: string
  role?: string
}

type Influence = { id: number; name: string }
type Genre = { id: number; name: string }

const INSTRUMENTS = [
  { name: 'Vocals', emoji: '🎤' },
  { name: 'Guitar', emoji: '🎸' },
  { name: 'Bass', emoji: '🎸' },
  { name: 'Drums', emoji: '🥁' },
  { name: 'Keyboards', emoji: '🎹' },
  { name: 'Violin', emoji: '🎻' },
  { name: 'Cello', emoji: '🎻' },
  { name: 'Trumpet', emoji: '🎺' },
  { name: 'Saxophone', emoji: '🎷' },
  { name: 'Flute', emoji: '🪈' },
  { name: 'DJ / Turntables', emoji: '🎧' },
]

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

export default function ManageBand() {
  const { bandId } = useParams()
  const [band, setBand] = useState<Band | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [influences, setInfluences] = useState<Influence[]>([])
  const [allInfluences, setAllInfluences] = useState<Influence[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isLeader, setIsLeader] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [bandPicPreview, setBandPicPreview] = useState<string | null>(null)
  const [bandPicFile, setBandPicFile] = useState<File | null>(null)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const [membersSuccess, setMembersSuccess] = useState(false)
  const [picSuccess, setPicSuccess] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [editCountry, setEditCountry] = useState('')
  const [editYearFormed, setEditYearFormed] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editInstagram, setEditInstagram] = useState('')
  const [editFacebook, setEditFacebook] = useState('')
  const [editYoutube, setEditYoutube] = useState('')
  const [editBandcamp, setEditBandcamp] = useState('')
  const [editSoundcloud, setEditSoundcloud] = useState('')
  const [editGenreIds, setEditGenreIds] = useState<number[]>([])
  const [editInfluenceIds, setEditInfluenceIds] = useState<number[]>([])
  const [influenceSearch, setInfluenceSearch] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoSuccess, setInfoSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Check user is leader of this band
      const { data: memberRecord } = await supabase
        .from('band_members')
        .select('role')
        .eq('band_id', bandId)
        .eq('profile_id', user.id)
        .eq('status', 'approved')
        .single()

      if (!memberRecord || memberRecord.role !== 'leader') {
        router.push('/dashboard')
        return
      }
      setIsLeader(true)

      const { data: bandData } = await supabase
        .from('bands').select('*').eq('id', bandId).single()
      if (!bandData) { router.push('/dashboard'); return }
      setBand(bandData)
      setBandPicPreview(bandData.band_pic_url)

      const { data: releaseData } = await supabase
        .from('releases')
        .select('id, title, release_type, release_year, cover_url')
        .eq('band_id', bandId)
        .order('release_year', { ascending: false })
      if (releaseData) setReleases(releaseData)

      const { data: infData } = await supabase
        .from('band_influences')
        .select('influence_id, influences_list(id, name)')
        .eq('band_id', bandId)
      if (infData) {
        const mapped = infData.map((i: any) => i.influences_list).filter(Boolean)
        setInfluences(mapped)
        setEditInfluenceIds(mapped.map((i: Influence) => i.id))
      }

      const { data: allInfData } = await supabase.from('influences_list').select('*').order('name')
      if (allInfData) setAllInfluences(allInfData)

      const { data: allGenreData } = await supabase.from('genres_list').select('*').order('name')
      if (allGenreData) setAllGenres(allGenreData)

      if (bandData.genre_ids && bandData.genre_ids.length > 0) {
        const { data: genreData } = await supabase
          .from('genres_list').select('id, name').in('id', bandData.genre_ids)
        if (genreData) setGenres(genreData)
        setEditGenreIds(bandData.genre_ids)
      }

      const { data: memberData } = await supabase
        .from('band_members')
        .select('*, profiles(username, first_name, last_name)')
        .eq('band_id', bandId)
        .eq('status', 'approved')
        .order('display_order')
      if (memberData && memberData.length > 0) {
        setMembers(memberData.map((m: any) => ({
          id: m.id,
          name: m.profiles?.first_name && m.profiles?.last_name
            ? `${m.profiles.first_name} ${m.profiles.last_name}`
            : m.name || m.profiles?.username || '',
          instruments: m.instrument ? m.instrument.split(',').map((s: string) => s.trim()) : [],
          primary_instrument: m.instrument ? m.instrument.split(',')[0].trim() : '',
          join_year: m.join_year?.toString() || '',
          country: m.country || '',
          profile_id: m.profile_id,
          status: m.status,
          role: m.role,
        })))
      } else {
        setMembers([{ name: '', instruments: [], primary_instrument: '', join_year: '', country: '' }])
      }

      setLoading(false)
    }
    load()
  }, [bandId])

  const startEditing = () => {
    if (!band) return
    setEditCountry(band.country || '')
    setEditYearFormed(band.year_formed?.toString() || '')
    setEditDescription(band.description || '')
    setEditInstagram(band.instagram_url || '')
    setEditFacebook(band.facebook_url || '')
    setEditYoutube(band.youtube_url || '')
    setEditBandcamp(band.bandcamp_url || '')
    setEditSoundcloud(band.soundcloud_url || '')
    setEditingInfo(true)
  }

  const handleSaveInfo = async () => {
    if (!band) return
    setSavingInfo(true)
    await supabase.from('bands').update({
      country: editCountry || null,
      year_formed: editYearFormed ? parseInt(editYearFormed) : null,
      description: editDescription || null,
      genre_ids: editGenreIds.length > 0 ? editGenreIds : null,
      instagram_url: editInstagram || null,
      facebook_url: editFacebook || null,
      youtube_url: editYoutube || null,
      bandcamp_url: editBandcamp || null,
      soundcloud_url: editSoundcloud || null,
    }).eq('id', band.id)

    await supabase.from('band_influences').delete().eq('band_id', band.id)
    if (editInfluenceIds.length > 0) {
      await supabase.from('band_influences').insert(
        editInfluenceIds.map(id => ({ band_id: band.id, influence_id: id }))
      )
    }

    const { data: updated } = await supabase.from('bands').select('*').eq('id', band.id).single()
    if (updated) setBand(updated)
    const newGenres = allGenres.filter(g => editGenreIds.includes(g.id))
    setGenres(newGenres)
    const newInfluences = allInfluences.filter(i => editInfluenceIds.includes(i.id))
    setInfluences(newInfluences)
    setSavingInfo(false)
    setInfoSuccess(true)
    setEditingInfo(false)
    setTimeout(() => setInfoSuccess(false), 3000)
  }

  const toggleGenre = (id: number) => setEditGenreIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleInfluence = (id: number) => setEditInfluenceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleBandPicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return }
    if (!file.type.startsWith('image/')) { alert('File must be an image.'); return }
    setBandPicFile(file)
    setBandPicPreview(URL.createObjectURL(file))
  }

  const handleUploadBandPic = async () => {
    if (!bandPicFile || !band) return
    setUploadingPic(true)
    const fileExt = bandPicFile.name.split('.').pop()
    const fileName = `bandpic-${band.id}-${Date.now()}.${fileExt}`
    const picPath = `bandpics/${fileName}`

    try {
      await uploadViaApi(bandPicFile, picPath, 'band-logos')
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || 'Unknown error'))
      setUploadingPic(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('band-logos').getPublicUrl(picPath)
    await supabase.from('bands').update({ band_pic_url: publicUrl }).eq('id', band.id)
    setBand(prev => prev ? { ...prev, band_pic_url: publicUrl } : prev)
    setBandPicFile(null)
    setUploadingPic(false)
    setPicSuccess(true)
    setTimeout(() => setPicSuccess(false), 3000)
  }

  const addMember = () => setMembers(prev => [...prev, { name: '', instruments: [], primary_instrument: '', join_year: '', country: '' }])
  const removeMember = (index: number) => setMembers(prev => prev.filter((_, i) => i !== index))
  const updateMember = (index: number, field: keyof Member, value: any) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const toggleInstrument = (memberIndex: number, instrument: string) => {
    setMembers(prev => prev.map((m, i) => {
      if (i !== memberIndex) return m
      const already = m.instruments.includes(instrument)
      const newInstruments = already ? m.instruments.filter(x => x !== instrument) : [...m.instruments, instrument]
      const newPrimary = newInstruments.length > 0
        ? (m.primary_instrument && newInstruments.includes(m.primary_instrument) ? m.primary_instrument : newInstruments[0])
        : ''
      return { ...m, instruments: newInstruments, primary_instrument: newPrimary }
    }))
  }

  const handleSaveMembers = async () => {
    if (!band) return
    setSavingMembers(true)
    const validMembers = members.filter(m => m.name.trim() && m.instruments.length > 0)

    // Delete non-leader members and re-insert
    await supabase.from('band_members')
      .delete()
      .eq('band_id', band.id)
      .eq('role', 'member')

    if (validMembers.length > 0) {
      await supabase.from('band_members').insert(
        validMembers.filter(m => m.role !== 'leader').map((m, i) => ({
          band_id: band.id,
          name: m.name.trim(),
          instrument: m.instruments.join(', '),
          join_year: m.join_year ? parseInt(m.join_year) : null,
          country: m.country || null,
          display_order: i + 1,
          role: 'member',
          status: 'approved',
        }))
      )
    }
    setSavingMembers(false)
    setMembersSuccess(true)
    setTimeout(() => setMembersSuccess(false), 3000)

    const handleSaveMembers = async () => {
    if (!band) return
    setSavingMembers(true)
    const validMembers = members.filter(m => m.name.trim() && m.instruments.length > 0)
    console.log('Valid members to save:', validMembers)

    const { error: deleteError } = await supabase.from('band_members')
      .delete()
      .eq('band_id', band.id)
      .eq('role', 'member')
    console.log('Delete error:', deleteError)

    if (validMembers.length > 0) {
      const { error: insertError } = await supabase.from('band_members').insert(
        validMembers.filter(m => m.role !== 'leader').map((m, i) => ({
          band_id: band.id,
          name: m.name.trim(),
          instrument: m.instruments.join(', '),
          join_year: m.join_year ? parseInt(m.join_year) : null,
          country: m.country || null,
          display_order: i + 1,
          role: 'member',
          status: 'approved',
        }))
      )
      console.log('Insert error:', insertError)
    }
    setSavingMembers(false)
    setMembersSuccess(true)
    setTimeout(() => setMembersSuccess(false), 3000)
  }
  }

  const handleDeleteRelease = async (releaseId: string) => {
    await supabase.from('tracks').delete().eq('release_id', releaseId)
    await supabase.from('releases').delete().eq('id', releaseId)
    setReleases(prev => prev.filter(r => r.id !== releaseId))
    setDeleteConfirm(null)
  }

  const filteredInfluences = allInfluences.filter(i =>
    i.name.toLowerCase().includes(influenceSearch.toLowerCase())
  )

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors text-sm"
  const labelClass = "text-xs uppercase tracking-widest text-zinc-500 mb-2 block"

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-600 animate-pulse">Loading...</p>
    </main>
  )
  if (!band) return null

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/dashboard" backLabel="Back to dashboard" />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
            {band.logo_url
              ? <img src={band.logo_url} alt={band.name} className="w-full h-full object-cover" />
              : <span className="text-3xl">🤘</span>}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-display uppercase tracking-tight">{band.name}</h1>
            <Link href={`/bands/${band.slug}`}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest mt-1 inline-block">
              View public page →
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Band info */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">Band Info</h2>
              {!editingInfo ? (
                <button onClick={startEditing}
                  className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest">
                  Edit
                </button>
              ) : (
                <button onClick={() => setEditingInfo(false)}
                  className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
                  Cancel
                </button>
              )}
            </div>

            {!editingInfo ? (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {band.country && <div><p className="text-zinc-600 text-xs uppercase tracking-widest mb-1">Country</p><p>{band.country}</p></div>}
                  {band.year_formed && <div><p className="text-zinc-600 text-xs uppercase tracking-widest mb-1">Formed</p><p>{band.year_formed}</p></div>}
                </div>
                {band.description && <div><p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Bio</p><p className="text-zinc-300 text-sm leading-relaxed">{band.description}</p></div>}
                {genres.length > 0 && (
                  <div>
                    <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Genres</p>
                    <div className="flex flex-wrap gap-2">
                      {genres.map(g => <span key={g.id} className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-400 uppercase tracking-wider">{g.name}</span>)}
                    </div>
                  </div>
                )}
                {influences.length > 0 && (
                  <div>
                    <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Influences ({influences.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {influences.map(inf => <span key={inf.id} className="px-3 py-1 bg-zinc-900 border border-red-900/40 rounded-full text-xs text-zinc-400">{inf.name}</span>)}
                    </div>
                  </div>
                )}
                {(band.instagram_url || band.facebook_url || band.youtube_url || band.bandcamp_url || band.soundcloud_url) && (
                  <div>
                    <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Social Links</p>
                    <div className="flex flex-wrap gap-2">
                      {band.instagram_url && <span className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-400">Instagram</span>}
                      {band.facebook_url && <span className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-400">Facebook</span>}
                      {band.youtube_url && <span className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-400">YouTube</span>}
                      {band.bandcamp_url && <span className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-400">Bandcamp</span>}
                      {band.soundcloud_url && <span className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-400">SoundCloud</span>}
                    </div>
                  </div>
                )}
                {infoSuccess && <p className="text-green-400 text-xs">Band info saved!</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Country</label>
                    <select value={editCountry} onChange={e => setEditCountry(e.target.value)} className={inputClass + ' cursor-pointer'}>
                      <option value="">Select country...</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Year Formed</label>
                    <input type="number" value={editYearFormed} onChange={e => setEditYearFormed(e.target.value)}
                      className={inputClass} min="1950" max={new Date().getFullYear()} placeholder="e.g. 2018" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Bio</label>
                  <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                    className={inputClass + ' min-h-28 resize-y'} placeholder="Tell the world about your band..." />
                </div>
                <div>
                  <label className={labelClass}>Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {allGenres.map(g => (
                      <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          editGenreIds.includes(g.id) ? 'bg-red-600 text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}>
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Influences ({editInfluenceIds.length} selected)</label>
                  {editInfluenceIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {editInfluenceIds.map(id => {
                        const inf = allInfluences.find(i => i.id === id)
                        return inf ? (
                          <button key={id} type="button" onClick={() => toggleInfluence(id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors">
                            {inf.name} ✕
                          </button>
                        ) : null
                      })}
                    </div>
                  )}
                  <input type="text" value={influenceSearch} onChange={e => setInfluenceSearch(e.target.value)}
                    className={inputClass + ' mb-2'} placeholder="Search influences..." />
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-zinc-800 rounded-lg p-2">
                    {filteredInfluences.filter(i => !editInfluenceIds.includes(i.id)).map(i => (
                      <button key={i.id} type="button" onClick={() => toggleInfluence(i.id)}
                        className="text-left px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors">
                        {i.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Social Links</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Instagram', value: editInstagram, set: setEditInstagram, placeholder: 'https://instagram.com/yourband' },
                      { label: 'Facebook', value: editFacebook, set: setEditFacebook, placeholder: 'https://facebook.com/yourband' },
                      { label: 'YouTube', value: editYoutube, set: setEditYoutube, placeholder: 'https://youtube.com/@yourband' },
                      { label: 'Bandcamp', value: editBandcamp, set: setEditBandcamp, placeholder: 'https://yourband.bandcamp.com' },
                      { label: 'SoundCloud', value: editSoundcloud, set: setEditSoundcloud, placeholder: 'https://soundcloud.com/yourband' },
                    ].map(({ label, value, set, placeholder }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-600 w-24 uppercase tracking-widest shrink-0">{label}</span>
                        <input type="url" value={value} onChange={e => set(e.target.value)}
                          className={inputClass} placeholder={placeholder} />
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleSaveInfo} disabled={savingInfo}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors">
                  {savingInfo ? 'Saving...' : 'Save Band Info'}
                </button>
              </div>
            )}
          </div>

          {/* Band picture */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Band Photo</h2>
            <p className="text-zinc-600 text-xs mb-4">Optional promo photo. Max 5MB.</p>
            <div className="flex items-start gap-6">
              <div onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-xl overflow-hidden transition-colors flex items-center justify-center shrink-0"
                style={{ width: '160px', height: '100px' }}>
                {bandPicPreview
                  ? <img src={bandPicPreview} alt="Band pic" className="w-full h-full object-cover" />
                  : <div className="text-center text-zinc-600 p-4"><p className="text-2xl mb-1">📷</p><p className="text-xs">Click to upload</p></div>
                }
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBandPicChange} className="hidden" />
              <div className="flex flex-col gap-3">
                {bandPicFile && (
                  <button onClick={handleUploadBandPic} disabled={uploadingPic}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-5 py-2 rounded-lg text-xs transition-colors">
                    {uploadingPic ? 'Uploading...' : 'Save Photo'}
                  </button>
                )}
                {picSuccess && <p className="text-green-400 text-xs">Photo saved!</p>}
                {bandPicPreview && !bandPicFile && <p className="text-zinc-600 text-xs">Click to change</p>}
              </div>
            </div>
          </div>

          {/* Leader card — non editable */}
            {members.filter(m => m.role === 'leader').map(leader => (
              <div key={leader.id} className="border border-red-900/30 rounded-xl p-4 flex items-center gap-4 bg-red-950/10">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{leader.name}</span>
                    <span className="text-xs bg-red-900/30 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full uppercase tracking-widest">👑 Leader</span>
                    {leader.profile_id && <span className="text-xs text-green-600 uppercase tracking-widest">· Linked account</span>}
                  </div>
                  {leader.instruments.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">{leader.instruments.join(', ')}</p>
                  )}
                </div>
              </div>
            ))}

          {/* Band members */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Band Members</h2>
            <div className="flex flex-col gap-6">
              {members.filter(m => m.role !== 'leader').map((member, index) => (
                <div key={index} className="border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-widest text-zinc-600">
                        {member.role === 'leader' ? '👑 Leader' : `Member ${index}`}
                      </span>
                      {member.profile_id && (
                        <span className="text-xs text-green-600 uppercase tracking-widest">· Linked</span>
                      )}
                    </div>
                    {member.role !== 'leader' && members.length > 1 && (
                      <button onClick={() => removeMember(index)}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={member.name}
                      onChange={e => updateMember(index, 'name', e.target.value)}
                      className={inputClass} placeholder="Name"
                      disabled={member.role === 'leader'} />
                    <input type="number" value={member.join_year}
                      onChange={e => updateMember(index, 'join_year', e.target.value)}
                      className={inputClass} placeholder="Since" min="1950" max={new Date().getFullYear()} />
                    <select value={member.country} onChange={e => updateMember(index, 'country', e.target.value)}
                      className={inputClass + ' cursor-pointer'}>
                      <option value="">Country...</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Instruments</p>
                    <div className="flex flex-wrap gap-2">
                      {INSTRUMENTS.map(inst => {
                        const selected = member.instruments.includes(inst.name)
                        return (
                          <button key={inst.name} type="button" onClick={() => toggleInstrument(index, inst.name)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              selected ? 'bg-red-600 text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}>
                            <span>{inst.emoji}</span><span>{inst.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    {member.instruments.length > 1 && (
                      <div className="mt-3">
                        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Primary instrument</p>
                        <div className="flex flex-wrap gap-2">
                          {member.instruments.map(inst => {
                            const emoji = INSTRUMENTS.find(i => i.name === inst)?.emoji || '🎵'
                            return (
                              <button key={inst} type="button"
                                onClick={() => updateMember(index, 'primary_instrument', inst)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                  member.primary_instrument === inst
                                    ? 'bg-zinc-700 border border-zinc-500 text-white'
                                    : 'bg-zinc-900 border border-zinc-700 text-zinc-500 hover:border-zinc-500'
                                }`}>
                                <span>{emoji}</span><span>{inst}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addMember}
              className="w-full border border-dashed border-zinc-700 hover:border-red-500 text-zinc-500 hover:text-white py-2 rounded-lg text-xs transition-colors mt-4">
              + Add member
            </button>
            <div className="flex items-center gap-4 mt-4">
              <button onClick={handleSaveMembers} disabled={savingMembers}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2 rounded-lg text-xs transition-colors">
                {savingMembers ? 'Saving...' : 'Save Members'}
              </button>
              {membersSuccess && <p className="text-green-400 text-xs">Members saved!</p>}
            </div>
          </div>

          {/* Releases */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">Releases ({releases.length})</h2>
              <Link href={`/dashboard/add-release?bandId=${bandId}`}
                className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-5 py-2 rounded-lg text-xs transition-colors">
                + Add Release
              </Link>
            </div>
            {releases.length === 0 ? (
              <div className="border border-zinc-800 rounded-xl p-12 text-center text-zinc-600">
                <p className="text-4xl mb-4">🎵</p>
                <p className="uppercase tracking-widest text-sm mb-6">No releases yet</p>
                <Link href={`/dashboard/add-release?bandId=${bandId}`}
                  className="inline-block border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white px-6 py-2 rounded-lg text-sm transition-colors">
                  Add your first release
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {releases.map(release => (
                  <div key={release.id} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {release.cover_url
                        ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                        : <span className="text-xl">🎵</span>}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{release.title}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {release.release_type}{release.release_year ? ` · ${release.release_year}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard/edit-release/${release.id}`}
                        className="text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">
                        Edit
                      </Link>
                      {deleteConfirm === release.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Sure?</span>
                          <button onClick={() => handleDeleteRelease(release.id)}
                            className="text-xs text-red-500 hover:text-red-400 font-bold transition-colors">Delete</button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-zinc-600 hover:text-white transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(release.id)}
                          className="text-xs text-zinc-700 hover:text-red-400 transition-colors uppercase tracking-widest">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
