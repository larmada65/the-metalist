'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../../components/GlobalNav'
import { createClient } from '../../../../lib/supabase'
import { uploadViaApi } from '../../../../lib/storage-upload-client'
import { canUploadAudioTrack, canAddLyrics, normalizeTier } from '../../../../lib/subscriptions'

const AUDIO_BUCKET = 'band-logos'
const AUDIO_PREFIX = 'audio'

function slugify(s: string): string {
  return s.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || 'track'
}

type Track = {
  id?: string
  title: string
  embed_url: string
  track_number: number
  duration: string
  lyrics_by: string
  music_by: string
  lyrics?: string
  audio_path?: string | null
  audio_file?: File | null
}

export default function EditRelease() {
  const { id } = useParams()
  const [bandSlug, setBandSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [showLyricsField, setShowLyricsField] = useState(false)

  const [title, setTitle] = useState('')
  const [releaseType, setReleaseType] = useState<'Single' | 'EP' | 'Album'>('EP')
  const [releaseYear, setReleaseYear] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [bandId, setBandId] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<{
    newBillable: number
    amountCents: number
    checkoutUrl: string | null
  } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Fetch release first to get band_id
      const { data: release } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .single()
      if (!release) { router.push('/dashboard/manage'); return }

      // Check user is leader or owner of this band
      const { data: band } = await supabase
        .from('bands')
        .select('id, slug, user_id')
        .eq('id', release.band_id)
        .single()
      if (!band) { router.push('/dashboard/manage'); return }

      const isOwner = band.user_id === user.id
      const { data: memberRecord } = await supabase
        .from('band_members')
        .select('role')
        .eq('band_id', band.id)
        .eq('profile_id', user.id)
        .eq('status', 'approved')
        .single()

      const canEdit = isOwner || (memberRecord?.role === 'leader')
      if (!canEdit) {
        router.push('/dashboard')
        return
      }

      setBandId(band.id)
      setBandSlug(band.slug)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .in('status', ['trialing', 'active'])
        .maybeSingle()
      const tier = normalizeTier(sub?.tier as string)
      setIsPro(tier === 'pro' || tier === 'pro_plus')
      setShowLyricsField(canAddLyrics(tier))

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
          embed_url: t.embed_url || '',
          track_number: t.track_number,
          duration: t.duration || '',
          lyrics_by: t.lyrics_by || '',
          music_by: t.music_by || '',
          lyrics: t.lyrics || '',
          audio_path: t.audio_path || null,
          audio_file: null,
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
      duration: '', lyrics_by: '', music_by: '', audio_path: null, audio_file: null,
    }])
  }

  const removeTrack = (index: number) => setTracks(prev => prev.filter((_, i) => i !== index))

  const updateTrack = (index: number, field: keyof Track, value: string | File | null) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const handleTrackAudioFile = (index: number, file: File | null) => {
    if (!file) {
      updateTrack(index, 'audio_file', null)
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Each MP3 must be under 25MB.')
      return
    }
    if (!file.type.includes('audio') && !file.name.toLowerCase().endsWith('.mp3')) {
      setError('Please upload an MP3 or other audio file.')
      return
    }
    setError('')
    updateTrack(index, 'audio_file', file)
    updateTrack(index, 'embed_url', '')
  }

  const normalizeUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    return url
  }

  const handleSave = async () => {
    setError('')
    setPaymentInfo(null)
    if (!title.trim()) { setError('Release title is required.'); return }
    if (!coverPreview) { setError('Cover art is required.'); return }
    const validTracks = tracks.filter(t =>
      t.title.trim() && (t.embed_url.trim() || t.audio_path || t.audio_file)
    )
    if (validTracks.length === 0) {
      setError('Add at least one track with a title and either a URL or hosted audio.')
      return
    }
    const hostedTrackCount = validTracks.filter(t => t.audio_path || t.audio_file).length
    for (const t of validTracks) {
      if (t.audio_file && !canUploadAudioTrack('pro').allowed) {
        setError('MP3 uploads require a Pro membership.')
        return
      }
    }
    setSaving(true)

    try {
      // If there are hosted tracks, ensure any new hosted tracks are paid for.
      if (hostedTrackCount > 0 && bandId) {
        try {
          const res = await fetch('/api/release-payments/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              releaseId: id,
              bandId,
              hostedTrackCount,
            }),
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            const msg = data?.error || 'Could not start payment for hosted tracks.'
            setError(msg)
            setSaving(false)
            return
          }

          const payment = await res.json()

          if (payment.newBillable > 0) {
            setPaymentInfo(payment)
            setError(
              `These changes add ${payment.newBillable} hosted track${payment.newBillable === 1 ? '' : 's'} that require payment before saving.`
            )
            setSaving(false)
            return
          }
        } catch {
          setError('Could not contact payments service for hosted tracks. Try again in a moment.')
          setSaving(false)
          return
        }
      }

      let newCoverUrl = coverUrl
      if (coverFile && bandId) {
        const fileExt = coverFile.name.split('.').pop()
        const fileName = `${bandId}-${Date.now()}.${fileExt}`
        const coverPath = `covers/${fileName}`

        try {
          await uploadViaApi(coverFile, coverPath, 'band-logos')
        } catch (e: any) {
          setError('Failed to upload cover: ' + (e?.message || 'Unknown error'))
          setSaving(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('band-logos')
          .getPublicUrl(coverPath)
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

      for (let i = 0; i < validTracks.length; i++) {
        const t = validTracks[i]
        let embedUrl = t.embed_url.trim() ? normalizeUrl(t.embed_url.trim()) : ''
        let audioPath: string | null = t.audio_path || null

        if (t.audio_file) {
          const ext = t.audio_file.name.toLowerCase().endsWith('.mp3') ? 'mp3' : t.audio_file.name.split('.').pop() || 'mp3'
          const safeName = `${i + 1}-${slugify(t.title)}.${ext}`
          const path = `${AUDIO_PREFIX}/${bandId}/${id}/${safeName}`
          const { error: upErr } = await supabase.storage
            .from(AUDIO_BUCKET)
            .upload(path, t.audio_file, { contentType: t.audio_file.type || 'audio/mpeg' })
          if (upErr) {
            setError('Failed to upload track: ' + upErr.message)
            setSaving(false)
            return
          }

          audioPath = path
          embedUrl = ''
        }

        await supabase.from('tracks').insert({
          release_id: id,
          title: t.title.trim(),
          track_number: i + 1,
          embed_url: embedUrl,
          audio_path: audioPath,
          duration: t.duration?.trim() || null,
          lyrics_by: t.lyrics_by?.trim() || null,
          music_by: t.music_by?.trim() || null,
          lyrics: t.lyrics?.trim() || null,
        })
      }

      // Ensure the release is published after a successful save so it is visible on the public site.
      await supabase
        .from('releases')
        .update({ published: true })
        .eq('id', id)

      setSuccess(true)
      setTimeout(() => router.push(`/releases/${id}`), 1200)
    } finally {
      setSaving(false)
    }
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
        <h1 className="text-4xl font-display uppercase tracking-tight mb-2">Edit Release</h1>
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

          <div>
            <label className={labelClass}>Tracks <span className="text-red-500">*</span></label>
            <p className="text-zinc-600 text-xs mb-4">
              URL or upload MP3 (Pro). Each track needs a title and one source.
              Hosted MP3s are billed at $2 per track when you save new hosted audio via Stripe.
            </p>
            {paymentInfo && paymentInfo.newBillable > 0 && paymentInfo.checkoutUrl && (
              <div className="mb-3 rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                <p className="mb-1">
                  These changes add {paymentInfo.newBillable} hosted track{paymentInfo.newBillable === 1 ? '' : 's'} (
                  ${(paymentInfo.amountCents / 100).toFixed(2)}). Complete payment in Stripe, then click
                  &nbsp;<span className="font-semibold">Save Changes</span> again to finish.
                </p>
                <a
                  href={paymentInfo.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded border border-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-colors"
                >
                  Pay for hosted tracks
                </a>
              </div>
            )}
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
                    onChange={e => {
                      updateTrack(index, 'embed_url', e.target.value)
                      if (e.target.value.trim()) updateTrack(index, 'audio_file', null)
                    }}
                    className={inputClass}
                    placeholder="https://youtube.com/watch?v=... or https://soundcloud.com/..." />
                  {track.audio_path && !track.audio_file && (
                    <p className="text-xs text-green-500">Hosted audio: {track.audio_path.split('/').pop()}</p>
                  )}
                  {isPro && (
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Or upload MP3 (Pro, max 25MB per file)</label>
                      <input
                        type="file"
                        accept="audio/mpeg,.mp3,audio/*"
                        onChange={e => handleTrackAudioFile(index, e.target.files?.[0] || null)}
                        className="block w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-red-600 file:text-white file:text-xs file:uppercase file:tracking-widest file:font-bold"
                      />
                      {track.audio_file && (
                        <p className="text-xs text-green-500 mt-1">
                          {track.audio_file.name} (replaces existing)
                        </p>
                      )}
                    </div>
                  )}
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
                  {showLyricsField && (
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Song lyrics (Pro+)</label>
                      <textarea value={track.lyrics || ''}
                        onChange={e => updateTrack(index, 'lyrics', e.target.value)}
                        className={inputClass + ' min-h-24 resize-y'}
                        placeholder="Paste lyrics here..." />
                    </div>
                  )}
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
