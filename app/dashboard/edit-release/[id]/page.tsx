'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../../components/GlobalNav'

type Track = {
  id?: string
  title: string
  embed_url: string
  track_number: number
  duration: string
  lyrics_by: string
  music_by: string
}

export default function EditRelease() {
  const { id } = useParams()
  const [bandSlug, setBandSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState('')
  const [releaseType, setReleaseType] = useState<'Single' | 'EP' | 'Album'>('EP')
  const [releaseYear, setReleaseYear] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [bandId, setBandId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: band } = await supabase
        .from('bands')
        .select('id, slug')
        .eq('user_id', user.id)
        .single()
      if (!band) { router.push('/dashboard'); return }
      setBandId(band.id)
      setBandSlug(band.slug)

      const { data: release } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .eq('band_id', band.id)
        .single()
      if (!release) { router.push('/dashboard/manage'); return }

      setTitle(release.title)
      setReleaseType(release.release_type)
      setReleaseYear(release.release_year?.toString() || '')
      setDescription(release.description || '')
      setCoverUrl(release.cover_url)
      setCoverPreview(release.cover_url)

      const { data: trackData } = await supabase
        .from('tracks')
        .select('*')
        .eq('release_id', id)
        .order('track_number')
      if (trackData) {
        setTracks(trackData.map(t => ({
          id: t.id,
          title: t.title,
          embed_url: t.embed_url,
          track_number: t.track_number,
          duration: t.duration || '',
          lyrics_by: t.lyrics_by || '',
          music_by: t.music_by || '',
        })))
      }

      setLoading(false)
    }
    load()
  }, [id])

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Cover must be under 2MB.'); return }
    if (!file.type.startsWith('image/')) { setError('File must be an image.'); return }
    setError('')
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const addTrack = () => {
    setTracks(prev => [...prev, {
      title: '', embed_url: '', track_number: prev.length + 1,
      duration: '', lyrics_by: '', music_by: ''
    }])
  }

  const removeTrack = (index: number) => setTracks(prev => prev.filter((_, i) => i !== index))

  const updateTrack = (index: number, field: keyof Track, value: string) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const normalizeUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    return url
  }

  const handleSave = async () => {
    setError('')
    if (!title.trim()) { setError('Release title is required.'); return }
    if (!coverPreview) { setError('Cover art is required.'); return }
    const validTracks = tracks.filter(t => t.title.trim() && t.embed_url.trim())
    if (validTracks.length === 0) { setError('Add at least one track with a title and URL.'); return }
    setSaving(true)

    let newCoverUrl = coverUrl
    if (coverFile && bandId) {
      const fileExt = coverFile.name.split('.').pop()
      const fileName = `${bandId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('band-logos')
        .upload(`covers/${fileName}`, coverFile)
      if (uploadError) {
        setError('Failed to upload cover: ' + uploadError.message)
        setSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage
        .from('band-logos')
        .getPublicUrl(`covers/${fileName}`)
      newCoverUrl = publicUrl
    }

    const { error: releaseError } = await supabase
      .from('releases')
      .update({
        title: title.trim(),
        release_type: releaseType,
        release_year: releaseYear ? parseInt(releaseYear) : null,
        description: description || null,
        cover_url: newCoverUrl,
      })
      .eq('id', id)

    if (releaseError) {
      setError(releaseError.message)
      setSaving(false)
      return
    }

    await supabase.from('tracks').delete().eq('release_id', id)
    await supabase.from('tracks').insert(
      validTracks.map((t, i) => ({
        release_id: id,
        title: t.title.trim(),
        track_number: i + 1,
        embed_url: normalizeUrl(t.embed_url.trim()),
        duration: t.duration?.trim() || null,
        lyrics_by: t.lyrics_by?.trim() || null,
        music_by: t.music_by?.trim() || null,
      }))
    )

    setSuccess(true)
    setTimeout(() => router.push('/dashboard/manage'), 1200)
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
  const labelClass = "text-xs uppercase tracking-widest text-zinc-500 mb-2 block"

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-600 animate-pulse">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref="/dashboard/manage" backLabel="Back to manage" />

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Edit Release</h1>
        <p className="text-zinc-500 mb-10">Update your release details.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700 text-green-400 text-sm px-4 py-3 rounded-lg mb-6">
            Release updated! Redirecting...
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div>
            <label className={labelClass}>Release Title <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className={inputClass} placeholder="e.g. The Darkest Hour" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <select value={releaseType} onChange={e => setReleaseType(e.target.value as any)}
                className={inputClass + ' cursor-pointer'}>
                <option value="Single">Single</option>
                <option value="EP">EP</option>
                <option value="Album">Album</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input type="number" value={releaseYear} onChange={e => setReleaseYear(e.target.value)}
                className={inputClass} min="1950" max={new Date().getFullYear()} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className={inputClass + ' min-h-24 resize-y'}
              placeholder="Tell us about this release..." />
          </div>

          {/* Cover art */}
          <div>
            <label className={labelClass}>Cover Art <span className="text-red-500">*</span></label>
            <p className="text-zinc-600 text-xs mb-3">Square image recommended. Max 2MB.</p>
            <div onClick={() => document.getElementById('cover-input')?.click()}
              className="cursor-pointer border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-xl p-6 text-center transition-colors">
              {coverPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={coverPreview} alt="Cover preview" className="w-32 h-32 object-cover rounded-lg" />
                  <p className="text-xs text-zinc-500">Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-600">
                  <span className="text-3xl">🎨</span>
                  <p className="text-sm">Click to upload cover art</p>
                </div>
              )}
            </div>
            <input id="cover-input" type="file" accept="image/*"
              onChange={handleCoverChange} className="hidden" />
          </div>

          {/* Tracks */}
          <div>
            <label className={labelClass}>Tracks <span className="text-red-500">*</span></label>
            <p className="text-zinc-600 text-xs mb-4">Paste YouTube or SoundCloud URLs.</p>
            <div className="flex flex-col gap-3">
              {tracks.map((track, index) => (
                <div key={index} className="border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-zinc-600">Track {index + 1}</span>
                    {tracks.length > 1 && (
                      <button onClick={() => removeTrack(index)}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                  <input type="text" value={track.title}
                    onChange={e => updateTrack(index, 'title', e.target.value)}
                    className={inputClass} placeholder="Track title" />
                  <input type="url" value={track.embed_url}
                    onChange={e => updateTrack(index, 'embed_url', e.target.value)}
                    className={inputClass} placeholder="https://youtube.com/watch?v=..." />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={track.duration}
                      onChange={e => updateTrack(index, 'duration', e.target.value)}
                      className={inputClass} placeholder="Duration (e.g. 4:32)" />
                    <input type="text" value={track.lyrics_by}
                      onChange={e => updateTrack(index, 'lyrics_by', e.target.value)}
                      className={inputClass} placeholder="Lyrics by" />
                    <input type="text" value={track.music_by}
                      onChange={e => updateTrack(index, 'music_by', e.target.value)}
                      className={inputClass} placeholder="Music by" />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addTrack} type="button"
              className="mt-3 w-full border border-dashed border-zinc-700 hover:border-red-500 text-zinc-500 hover:text-white py-3 rounded-xl text-sm transition-colors">
              + Add another track
            </button>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="mt-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  )
}
