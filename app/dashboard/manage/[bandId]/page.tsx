'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import GlobalNav from '../../../../components/GlobalNav'
import { SUBSCRIPTION_LIMITS, type SubscriptionTier } from '../../../../lib/subscriptions'

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
  is_published: boolean
  audio_storage_bytes?: number
  audio_tracks_uploaded_this_period?: number
  audio_period_start?: string
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

type JoinRequest = {
  id: string
  name: string
  instrument: string
  created_at: string
  profiles: { username: string; first_name: string | null; last_name: string | null } | null
}

type Show = {
  id: string
  date: string
  city: string
  country: string | null
  venue: string | null
  ticket_url: string | null
}

type BandPost = {
  id: string
  content: string
  created_at: string
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
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [newShowDate, setNewShowDate] = useState('')
  const [newShowCity, setNewShowCity] = useState('')
  const [newShowCountry, setNewShowCountry] = useState('')
  const [newShowVenue, setNewShowVenue] = useState('')
  const [newShowTicketUrl, setNewShowTicketUrl] = useState('')
  const [savingShow, setSavingShow] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [posts, setPosts] = useState<BandPost[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [savingPost, setSavingPost] = useState(false)
  const [postDeleteConfirm, setPostDeleteConfirm] = useState<string | null>(null)
  const [savingMembers, setSavingMembers] = useState(false)
  const [membersSuccess, setMembersSuccess] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([])
  const [memberSearchLoading, setMemberSearchLoading] = useState(false)
  const [memberSearchError, setMemberSearchError] = useState<string | null>(null)
  const [memberInviteSuccess, setMemberInviteSuccess] = useState<string | null>(null)
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
  const [togglingPublish, setTogglingPublish] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active')
  const [audioTracksUsed, setAudioTracksUsed] = useState(0)
  const [audioStorageUsed, setAudioStorageUsed] = useState(0)
  const [audioPeriodEnd, setAudioPeriodEnd] = useState<string | null>(null)

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

      // Audio usage from band row (defaults safe if columns not present yet)
      setAudioTracksUsed(bandData.audio_tracks_uploaded_this_period ?? 0)
      setAudioStorageUsed(bandData.audio_storage_bytes ?? 0)
      setAudioPeriodEnd(null)

      // Owner subscription (if subscriptions table exists)
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('tier, status, current_period_end')
        .eq('user_id', user.id)
        .in('status', ['trialing', 'active'])
        .maybeSingle()

      if (!subError && subscription) {
        setSubscriptionTier(subscription.tier as SubscriptionTier)
        setSubscriptionStatus(subscription.status)
        setAudioPeriodEnd(subscription.current_period_end)
      } else {
        setSubscriptionTier('free')
        setSubscriptionStatus('inactive')
      }

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
        .select('*, profiles(username)')
        .eq('band_id', bandId)
        .eq('status', 'approved')
        .order('display_order')
      if (memberData && memberData.length > 0) {
        setMembers(memberData.map((m: any) => ({
          id: m.id,
          name: m.name || m.profiles?.username || '',
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

      const { data: requestData } = await supabase
        .from('band_members')
        .select('id, name, instrument, created_at, profiles(username, first_name, last_name)')
        .eq('band_id', bandId)
        .eq('status', 'pending')
        .order('created_at')
      if (requestData) setJoinRequests(requestData as any)

      const { data: showData } = await supabase
        .from('shows')
        .select('id, date, city, country, venue, ticket_url')
        .eq('band_id', bandId)
        .order('date', { ascending: true })
      if (showData) setShows(showData)

      const { data: postData } = await supabase
        .from('band_posts')
        .select('id, content, created_at')
        .eq('band_id', bandId)
        .order('created_at', { ascending: false })
      if (postData) setPosts(postData)

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

  const handleTogglePublish = async () => {
    if (!band) return
    setTogglingPublish(true)
    await supabase.from('bands').update({ is_published: !band.is_published }).eq('id', band.id)
    setBand(prev => prev ? { ...prev, is_published: !prev.is_published } : null)
    setTogglingPublish(false)
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
    const { error: uploadError } = await supabase.storage
      .from('band-logos').upload(`bandpics/${fileName}`, bandPicFile)
    if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploadingPic(false); return }
    const { data: { publicUrl } } = supabase.storage.from('band-logos').getPublicUrl(`bandpics/${fileName}`)
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

  const handleSearchMembers = async () => {
    if (!band) return
    const term = memberSearchTerm.trim()
    setMemberInviteSuccess(null)
    if (term.length < 2) {
      setMemberSearchError('Type at least 2 characters to search.')
      setMemberSearchResults([])
      return
    }
    setMemberSearchLoading(true)
    setMemberSearchError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url')
      .ilike('username', `%${term}%`)
      .limit(10)
    if (error) {
      setMemberSearchError(error.message)
      setMemberSearchResults([])
    } else {
      setMemberSearchResults(data || [])
    }
    setMemberSearchLoading(false)
  }

  const handleInviteExistingMember = async (profileId: string) => {
    if (!band) return
    setMemberSearchError(null)
    setMemberInviteSuccess(null)

    // Prevent inviting someone who already has any membership/invite for this band
    const { data: existing } = await supabase
      .from('band_members')
      .select('id, status')
      .eq('band_id', band.id)
      .eq('profile_id', profileId)
      .maybeSingle()

    if (existing) {
      setMemberSearchError('This user is already a member or has a pending invite for this band.')
      return
    }

    const { error } = await supabase.from('band_members').insert({
      band_id: band.id,
      profile_id: profileId,
      name: null,
      instrument: null,
      join_year: null,
      country: null,
      role: 'member',
      status: 'invited',
      display_order: 999,
    })

    if (error) {
      setMemberSearchError(error.message)
      return
    }

    try {
      await supabase.from('notifications').insert({
        user_id: profileId,
        title: `Invitation to join ${band.name}`,
        body: 'Open your dashboard to accept or decline the invitation.',
        href: '/dashboard',
      })
    } catch (_) {}

    setMemberInviteSuccess('Invitation sent. They can accept from their dashboard.')
    setMemberSearchResults(prev => prev.filter(p => p.id !== profileId))
  }

  const handleSaveMembers = async () => {
    if (!band) return
    setSavingMembers(true)
    setMembersError(null)

    // Ensure the chosen primary instrument is first in the instruments array before persisting.
    const normalizedMembers = members.map(m => {
      if (!m.primary_instrument || !m.instruments.includes(m.primary_instrument)) return m
      const rest = m.instruments.filter(inst => inst !== m.primary_instrument)
      return { ...m, instruments: [m.primary_instrument, ...rest] }
    })
    // Keep state in sync with what we are about to persist
    setMembers(normalizedMembers)

    // Only manually-added (no profile_id) rows with name + instrument
    const membersToSave = normalizedMembers.filter(
      m => !m.profile_id && m.name.trim() && m.instruments.length > 0
    )

    // Only delete manually-added rows (profile_id IS NULL) — leave linked members (including leader) intact
    const { error: deleteError } = await supabase
      .from('band_members')
      .delete()
      .eq('band_id', band.id)
      .neq('role', 'leader')
      .is('profile_id', null)

    if (deleteError) {
      setMembersError(deleteError.message)
      setSavingMembers(false)
      return
    }

    if (membersToSave.length > 0) {
      const { error: insertError } = await supabase
        .from('band_members')
        .insert(
          membersToSave.map((m, i) => ({
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

      if (insertError) {
        setMembersError(insertError.message)
        setSavingMembers(false)
        return
      }
    }

    // Update editable fields for account-linked members (join_year, country, instruments)
    // Includes the leader row if it's linked to a profile.
    const linkedMembers = normalizedMembers.filter(m => !!m.profile_id && !!m.id)
    for (const lm of linkedMembers) {
      const { error: updateError } = await supabase
        .from('band_members')
        .update({
          instrument: lm.instruments.join(', ') || null,
          join_year: lm.join_year ? parseInt(lm.join_year) : null,
          country: lm.country || null,
        })
        .eq('id', lm.id)
      if (updateError) {
        setMembersError(updateError.message)
        setSavingMembers(false)
        return
      }
    }

    // Reload from DB so the UI reflects exactly what was persisted
    const { data: reloaded } = await supabase
      .from('band_members')
      .select('*, profiles(username)')
      .eq('band_id', band.id)
      .eq('status', 'approved')
      .order('display_order')

    if (reloaded) {
      setMembers(
        reloaded.length > 0
          ? reloaded.map((m: any) => ({
              id: m.id,
              name: m.name || m.profiles?.username || '',
              instruments: m.instrument ? m.instrument.split(',').map((s: string) => s.trim()) : [],
              primary_instrument: m.instrument ? m.instrument.split(',')[0].trim() : '',
              join_year: m.join_year?.toString() || '',
              country: m.country || '',
              profile_id: m.profile_id,
              status: m.status,
              role: m.role,
            }))
          : [{ name: '', instruments: [], primary_instrument: '', join_year: '', country: '' }]
      )
    }

    setSavingMembers(false)
    setMembersSuccess(true)
    setTimeout(() => setMembersSuccess(false), 3000)
  }

  const handleDeleteRelease = async (releaseId: string) => {
    await supabase.from('tracks').delete().eq('release_id', releaseId)
    await supabase.from('releases').delete().eq('id', releaseId)
    setReleases(prev => prev.filter(r => r.id !== releaseId))
    setDeleteConfirm(null)
  }

  const reloadApprovedMembers = async () => {
    const { data: reloaded } = await supabase
      .from('band_members')
      .select('*, profiles(username)')
      .eq('band_id', bandId as string)
      .eq('status', 'approved')
      .order('display_order')
    if (reloaded && reloaded.length > 0) {
      setMembers(reloaded.map((m: any) => ({
        id: m.id,
        name: m.name || m.profiles?.username || '',
        instruments: m.instrument ? m.instrument.split(',').map((s: string) => s.trim()) : [],
        primary_instrument: m.instrument ? m.instrument.split(',')[0].trim() : '',
        join_year: m.join_year?.toString() || '',
        country: m.country || '',
        profile_id: m.profile_id,
        status: m.status,
        role: m.role,
      })))
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    const nextOrder = members.length + 1
    await supabase
      .from('band_members')
      .update({ status: 'approved', display_order: nextOrder })
      .eq('id', requestId)
    setJoinRequests(prev => prev.filter(r => r.id !== requestId))
    await reloadApprovedMembers()
    setProcessingRequest(null)
  }

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    await supabase.from('band_members').update({ status: 'rejected' }).eq('id', requestId)
    setJoinRequests(prev => prev.filter(r => r.id !== requestId))
    setProcessingRequest(null)
  }

  const handleAddShow = async () => {
    if (!band || !newShowDate || !newShowCity.trim()) return
    setSavingShow(true)
    const { data } = await supabase.from('shows').insert({
      band_id: band.id,
      date: newShowDate,
      city: newShowCity.trim(),
      country: newShowCountry || null,
      venue: newShowVenue.trim() || null,
      ticket_url: newShowTicketUrl.trim() || null,
    }).select().single()
    if (data) {
      setShows(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
      setNewShowDate('')
      setNewShowCity('')
      setNewShowCountry('')
      setNewShowVenue('')
      setNewShowTicketUrl('')

      // Notify band followers
      try {
        const { data: followers } = await supabase
          .from('follows')
          .select('user_id')
          .eq('band_id', band.id)

        if (followers && followers.length > 0) {
          const [y, m, d] = newShowDate.split('-').map(Number)
          const dateLabel = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          await supabase.from('notifications').insert(
            followers.map((f: any) => ({
              user_id: f.user_id,
              title: `${band.name} has a show on ${dateLabel}`,
              body: `${newShowCity.trim()}${newShowCountry ? `, ${newShowCountry}` : ''}`,
              href: `/bands/${band.slug}`,
            }))
          )
        }
      } catch (_) {}
    }
    setSavingShow(false)
  }

  const handleDeleteShow = async (showId: string) => {
    await supabase.from('shows').delete().eq('id', showId)
    setShows(prev => prev.filter(s => s.id !== showId))
    setShowDeleteConfirm(null)
  }

  const handleCreatePost = async () => {
    if (!band || !newPostContent.trim()) return
    setSavingPost(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingPost(false); return }
    const { data: newPost } = await supabase
      .from('band_posts')
      .insert({ band_id: band.id, author_id: user.id, content: newPostContent.trim() })
      .select('id, content, created_at')
      .single()
    if (newPost) {
      setPosts(prev => [newPost, ...prev])
      setNewPostContent('')
      const { data: followers } = await supabase.from('follows').select('user_id').eq('band_id', band.id)
      if (followers && followers.length > 0) {
        await supabase.from('notifications').insert(
          followers.map((f: any) => ({
            user_id: f.user_id,
            title: `${band.name} posted an update`,
            body: newPostContent.trim().slice(0, 120),
            href: `/bands/${band.slug}`,
          }))
        )
      }
    }
    setSavingPost(false)
  }

  const handleDeletePost = async (postId: string) => {
    await supabase.from('band_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setPostDeleteConfirm(null)
  }

  const handleRemoveLinkedMember = async (memberId: string) => {
    await supabase.from('band_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  const filteredInfluences = allInfluences.filter(i =>
    i.name.toLowerCase().includes(influenceSearch.toLowerCase())
  )

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors text-sm"
  const labelClass = "text-xs uppercase tracking-widest text-zinc-500 mb-2 block"
  const tierLimits = SUBSCRIPTION_LIMITS[subscriptionTier]
  const tracksLimit = tierLimits.maxTracksPerMonth
  const storageLimitMb = tierLimits.maxStorageBytes / (1024 * 1024)
  const tracksUsedLabel = tracksLimit > 0 ? `${audioTracksUsed}/${tracksLimit} tracks this period` : 'Audio uploads locked on Free'
  const storageUsedLabel = tierLimits.maxStorageBytes > 0
    ? `${(audioStorageUsed / (1024 * 1024)).toFixed(1)} / ${storageLimitMb.toFixed(0)} MB used`
    : 'No audio storage on Free'

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
            <div className="flex items-center gap-3 mt-1.5">
              <Link href={`/bands/${band.slug}`}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest">
                View public page →
              </Link>
              <Link href={`/dashboard/manage/${bandId}/analytics`}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest">
                Analytics →
              </Link>
              <button
                onClick={handleTogglePublish}
                disabled={togglingPublish}
                className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                  band.is_published
                    ? 'border-green-800 text-green-500 hover:border-red-800 hover:text-red-400'
                    : 'border-zinc-700 text-zinc-500 hover:border-green-700 hover:text-green-400'
                }`}>
                {band.is_published ? '● Published' : '○ Draft'}
              </button>
            </div>
          </div>
        </div>

        {/* Audio plan summary */}
        <div className="border border-zinc-800 rounded-xl p-4 mb-10 bg-zinc-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Audio Plan</p>
              <p className="text-sm">
                <span className="font-bold capitalize">{subscriptionTier}</span>{' '}
                {subscriptionTier === 'free'
                  ? '— upgrade to upload MP3s directly to Metalist.'
                  : 'plan for this band.'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {tracksUsedLabel} · {storageUsedLabel}
                {audioPeriodEnd && (
                  <> · Renews {new Date(audioPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                )}
              </p>
            </div>
            <Link
              href="/plans"
              className="text-[11px] font-bold uppercase tracking-widest border border-zinc-700 hover:border-red-500 text-zinc-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors shrink-0"
            >
              Manage plan
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

          {/* Join Requests */}
          {joinRequests.length > 0 && (
            <div className="border border-amber-900/50 bg-amber-950/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs uppercase tracking-widest text-amber-500">Join Requests</h2>
                <span className="bg-amber-600 text-white text-xs font-black px-2 py-0.5 rounded-full">
                  {joinRequests.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {joinRequests.map(req => {
                  const displayName = [req.profiles?.first_name, req.profiles?.last_name].filter(Boolean).join(' ') || req.name
                  return (
                    <div key={req.id} className="border border-zinc-800 bg-black rounded-xl p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm">{req.name}</p>
                          {req.profiles?.username && (
                            <span className="text-xs text-zinc-500">@{req.profiles.username}</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{req.instrument}</p>
                        <p className="text-xs text-zinc-700 mt-0.5">
                          {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          disabled={processingRequest === req.id}
                          className="bg-green-800 hover:bg-green-700 disabled:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
                          {processingRequest === req.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          disabled={processingRequest === req.id}
                          className="border border-zinc-700 hover:border-red-700 bg-zinc-900 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Band members */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Band Members</h2>
            <div className="flex flex-col gap-6">
              {members.map((member, index) => (
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
                    {member.role !== 'leader' && (
                      <button
                        onClick={() => member.profile_id && member.id
                          ? handleRemoveLinkedMember(member.id)
                          : removeMember(index)
                        }
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                  {/* Duplicate warning: manual entry whose name matches a linked member */}
                  {!member.profile_id && member.role !== 'leader' && (() => {
                    const dup = members.find(m => !!m.profile_id && m.name.toLowerCase() === member.name.toLowerCase())
                    return dup ? (
                      <div className="flex items-center justify-between gap-3 bg-amber-950/40 border border-amber-900/50 rounded-lg px-4 py-2.5">
                        <p className="text-xs text-amber-400">
                          Duplicate of linked account <strong>{dup.name}</strong>. Remove this manual entry.
                        </p>
                        <button onClick={() => removeMember(index)}
                          className="text-xs text-amber-400 hover:text-amber-300 font-bold uppercase tracking-widest shrink-0 transition-colors">
                          Remove
                        </button>
                      </div>
                    ) : null
                  })()}
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={member.name}
                      onChange={e => updateMember(index, 'name', e.target.value)}
                      className={inputClass + (member.role === 'leader' || member.profile_id ? ' opacity-50 cursor-not-allowed' : '')}
                      placeholder="Name"
                      disabled={member.role === 'leader' || !!member.profile_id} />
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
            <button
              onClick={() => {
                setAddMemberOpen(v => !v)
                setMemberSearchError(null)
                setMemberInviteSuccess(null)
              }}
              className="w-full border border-dashed border-zinc-700 hover:border-red-500 text-zinc-500 hover:text-white py-2 rounded-lg text-xs transition-colors mt-4">
              {addMemberOpen ? 'Close member browser' : '+ Add member from Metalist'}
            </button>

            {addMemberOpen && (
              <div className="mt-4 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Invite an existing Metalist member to this band
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={memberSearchTerm}
                    onChange={e => { setMemberSearchTerm(e.target.value); setMemberSearchError(null); setMemberInviteSuccess(null) }}
                    placeholder="Search by username..."
                    className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSearchMembers}
                    disabled={memberSearchLoading}
                    className="px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {memberSearchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {memberSearchError && (
                  <p className="text-xs text-red-400">{memberSearchError}</p>
                )}
                {memberInviteSuccess && (
                  <p className="text-xs text-green-400">{memberInviteSuccess}</p>
                )}
                {memberSearchResults.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 max-h-56 overflow-y-auto">
                    {memberSearchResults.map(profile => {
                      const display =
                        [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
                        profile.username
                      return (
                        <div
                          key={profile.id}
                          className="flex items-center gap-3 border border-zinc-800 rounded-lg px-3 py-2"
                        >
                          <div className="w-7 h-7 rounded-full bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center text-[11px] font-bold">
                            {profile.avatar_url
                              ? <img src={profile.avatar_url} alt={display} className="w-full h-full object-cover" />
                              : display[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{display}</p>
                            <p className="text-[11px] text-zinc-500 truncate">@{profile.username}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInviteExistingMember(profile.id)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-white transition-colors shrink-0"
                          >
                            Invite
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {memberSearchResults.length === 0 && !memberSearchLoading && !memberSearchError && memberSearchTerm.trim().length >= 2 && (
                  <p className="text-xs text-zinc-600">No members found.</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <button onClick={handleSaveMembers} disabled={savingMembers}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2 rounded-lg text-xs transition-colors">
                {savingMembers ? 'Saving...' : 'Save Members'}
              </button>
              {membersSuccess && <p className="text-green-400 text-xs">Members saved!</p>}
              {membersError && <p className="text-red-400 text-xs">{membersError}</p>}
            </div>
          </div>

          {/* Shows */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Tour Dates / Shows</h2>

            {/* Existing shows */}
            {shows.length > 0 && (
              <div className="flex flex-col gap-2 mb-6">
                {shows.map(show => (
                  <div key={show.id} className="border border-zinc-800 rounded-xl p-3 flex items-center gap-4">
                    <div className="shrink-0 text-center w-10">
                      <p className="text-sm font-black leading-none">{show.date.split('-')[2]}</p>
                      <p className="text-xs text-red-500 font-bold uppercase">
                        {new Date(show.date + 'T12:00:00').toLocaleString('en-US', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">
                        {show.city}{show.country ? `, ${show.country}` : ''}
                      </p>
                      {show.venue && <p className="text-xs text-zinc-600 truncate">{show.venue}</p>}
                      {show.ticket_url && <p className="text-xs text-zinc-700 truncate">{show.ticket_url}</p>}
                    </div>
                    {showDeleteConfirm === show.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-zinc-500">Sure?</span>
                        <button onClick={() => handleDeleteShow(show.id)} className="text-xs text-red-500 font-bold hover:text-red-400 transition-colors">Delete</button>
                        <button onClick={() => setShowDeleteConfirm(null)} className="text-xs text-zinc-600 hover:text-white transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowDeleteConfirm(show.id)}
                        className="text-xs text-zinc-700 hover:text-red-400 transition-colors uppercase tracking-widest shrink-0">
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add show form */}
            <div className="border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
              <p className="text-xs uppercase tracking-widest text-zinc-600">Add a show</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" value={newShowDate} onChange={e => setNewShowDate(e.target.value)}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input type="text" value={newShowCity} onChange={e => setNewShowCity(e.target.value)}
                    className={inputClass} placeholder="e.g. Berlin" />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <select value={newShowCountry} onChange={e => setNewShowCountry(e.target.value)}
                    className={inputClass + ' cursor-pointer'}>
                    <option value="">Select...</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Venue (optional)</label>
                  <input type="text" value={newShowVenue} onChange={e => setNewShowVenue(e.target.value)}
                    className={inputClass} placeholder="e.g. Columbiahalle" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Ticket URL (optional)</label>
                <input type="url" value={newShowTicketUrl} onChange={e => setNewShowTicketUrl(e.target.value)}
                  className={inputClass} placeholder="https://tickets.example.com/..." />
              </div>
              <button onClick={handleAddShow} disabled={savingShow || !newShowDate || !newShowCity.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-2.5 rounded-lg transition-colors text-xs">
                {savingShow ? 'Saving...' : '+ Add Show'}
              </button>
            </div>
          </div>

          {/* Band Updates / Posts */}
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Band Updates</h2>
            <div className="flex flex-col gap-3 mb-6">
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value.slice(0, 500))}
                placeholder="Share a news update, announcement, or message for your followers..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors text-sm resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreatePost}
                  disabled={savingPost || !newPostContent.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest px-6 py-2 rounded-lg text-xs transition-colors">
                  {savingPost ? 'Posting...' : 'Post Update'}
                </button>
                <span className="text-xs text-zinc-700">{newPostContent.length}/500</span>
              </div>
            </div>
            {posts.length === 0 ? (
              <p className="text-xs text-zinc-700 uppercase tracking-widest">No updates posted yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {posts.map(post => (
                  <div key={post.id} className="border border-zinc-800 rounded-xl p-4">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{post.content}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-zinc-700">
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {postDeleteConfirm === post.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Sure?</span>
                          <button onClick={() => handleDeletePost(post.id)} className="text-xs text-red-500 font-bold hover:text-red-400 transition-colors">Delete</button>
                          <button onClick={() => setPostDeleteConfirm(null)} className="text-xs text-zinc-600 hover:text-white transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setPostDeleteConfirm(post.id)}
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