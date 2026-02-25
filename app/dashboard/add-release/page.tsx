'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../components/GlobalNav'

type Track = {
  title: string
  embed_url: string
  duration?: string
  lyrics_by?: string
  music_by?: string
}

export default function AddRelease() {
  const [bandId, setBandId] = useState<string | null>(null)
  const [bandSlug, setBandSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Release fields
  const [title, setTitle] = useState('')
  const [releaseType, setReleaseType] = useState<'Single' | 'EP' | 'Album'>('EP')
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear().toString())
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // Tracks
  const [tracks, setTracks] = useState<Track[]>([{ title: '', embed_url: '' }])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get bandId from URL
      const params = new URLSearchParams(window.location.search)
      const bandIdParam = params.get('bandId')
      if (!bandIdParam) { router.push('/dashboard'); return }

      // Verify user is leader of this band
      const { data: memberRecord } = await supabase
        .from('band_members')
        .select('role')
        .eq('band_id', bandIdParam)
        .eq('profile_id', user.id)
        .eq('status', 'approved')
        .single()

      if (!memberRecord || memberRecord.role !== 'leader') {
        router.push('/dashboard')
        return
      }

      const { data: band } = await supabase
        .from('bands')
        .select('id, slug')
        .eq('id', bandIdParam)
        .single()

      if (!band) { router.push('/dashboard'); return }
      setBandId(band.id)
      setBandSlug(band.slug)
    }
    load()
  }, [])

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
    setTracks(prev => [...prev, { title: '', embed_url: '' }])
  }

  const removeTrack = (index: number) => {
    setTracks(prev => prev.filter((_, i) => i !== index))
  }

  const updateTrack = (index: number, field: keyof Track, value: string) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const normalizeUrl = (url: string) => {
    // Convert YouTube watch URLs to embed URLs
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

    // Convert SoundCloud URLs — keep as-is, we'll use oEmbed style
    if (url.includes('soundcloud.com')) return url

    return url
  }

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) { setError('Release title is required.'); return }
    if (!bandId) { setError('No band found.'); return }

    const validTracks = tracks.filter(t => t.title.trim() && t.embed_url.trim())
    if (!coverFile) { setError('Cover art is required.'); return }
    if (validTracks.length === 0) { setError('Add at least one track with a title and URL.'); return }

    setLoading(true)

    // Upload cover if provided
    let coverUrl = null
    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop()
      const fileName = `${bandId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('band-logos')
        .upload(`covers/${fileName}`, coverFile)

      if (uploadError) {
        setError('Failed to upload cover: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('band-logos')
        .getPublicUrl(`covers/${fileName}`)
      coverUrl = publicUrl
    }

    // Create release
    const { data: release, error: releaseError } = await supabase
      .from('releases')
      .insert({
        band_id: bandId,
        title: title.trim(),
        release_type: releaseType,
        release_year: parseInt(releaseYear),
        description: description || null,
        cover_url: coverUrl,
      })
      .select()
      .single()

    if (releaseError || !release) {
      setError(releaseError?.message || 'Something went wrong.')
      setLoading(false)
      return
    }

    // Insert tracks
    await supabase.from('tracks').insert(
      validTracks.map((t, i) => ({
        release_id: release.id,
        title: t.title.trim(),
        track_number: i + 1,
        embed_url: normalizeUrl(t.embed_url.trim()),
        duration: t.duration?.trim() || null,
        lyrics_by: t.lyrics_by?.trim() || null,
        music_by: t.music_by?.trim() || null,
      }))
    )

    // Notify band followers
    try {
      const { data: followers } = await supabase
        .from('follows')
        .select('user_id')
        .eq('band_id', bandId)

      if (followers && followers.length > 0) {
        const { data: bandData } = await supabase
          .from('bands')
          .select('name')
          .eq('id', bandId)
          .single()

        await supabase.from('notifications').insert(
          followers.map((f: any) => ({
            user_id: f.user_id,
            title: `${bandData?.name || 'A band you follow'} released "${title.trim()}"`,
            body: `New ${releaseType} on The Metalist.`,
            href: `/bands/${bandSlug}`,
          }))
        )
      }
    } catch (_) {}

    router.push(`/bands/${bandSlug}`)
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
  const labelClass = "text-xs uppercase tracking-widest text-zinc-500 mb-2 block"

  return (
    <main className="min-h-screen bg-black text-white">
      <GlobalNav backHref={bandId ? `/dashboard/manage/${bandId}` : '/dashboard'} backLabel="Back to manage" />

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Add Release</h1>
        <p className="text-zinc-500 mb-10">Share your music with metalheads.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Release info */}
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
            <label className={labelClass}>Cover Art</label>
            <p className="text-zinc-600 text-xs mb-3">Optional but recommended. Square image, max 2MB.</p>
            <div onClick={() => document.getElementById('cover-input')?.click()}
              className="cursor-pointer border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-lg p-6 text-center transition-colors">
              {coverPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={coverPreview} alt="Cover preview" className="w-32 h-32 object-cover rounded" />
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
            <p className="text-zinc-600 text-xs mb-4">
              Paste YouTube or SoundCloud URLs. YouTube: copy the URL from your browser. SoundCloud: copy the track URL.
            </p>
            <div className="flex flex-col gap-3">
              {tracks.map((track, index) => (
                <div key={index} className="border border-zinc-800 rounded p-4 flex flex-col gap-3">
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
                    className={inputClass} placeholder="https://youtube.com/watch?v=... or https://soundcloud.com/..." />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={track.duration || ''}
                      onChange={e => updateTrack(index, 'duration', e.target.value)}
                      className={inputClass} placeholder="Duration (e.g. 4:32)" />
                    <input type="text" value={track.lyrics_by || ''}
                      onChange={e => updateTrack(index, 'lyrics_by', e.target.value)}
                      className={inputClass} placeholder="Lyrics by" />
                    <input type="text" value={track.music_by || ''}
                      onChange={e => updateTrack(index, 'music_by', e.target.value)}
                      className={inputClass} placeholder="Music by" />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addTrack} type="button"
              className="mt-3 w-full border border-dashed border-zinc-700 hover:border-red-500 text-zinc-500 hover:text-white py-3 rounded text-sm transition-colors">
              + Add another track
            </button>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="mt-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors">
            {loading ? 'Publishing...' : '🤘 Publish Release'}
          </button>
        </div>
      </div>
    </main>
  )
}
