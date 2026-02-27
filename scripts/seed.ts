/**
 * Seed script: populates the-metalist with fake profiles, bands, releases, reviews, etc.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase Dashboard → Settings → API)
 * Run: npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local first
try {
  const envPath = path.join(process.cwd(), '.env.local')
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch (_) {
  // .env.local may not exist; env might be set another way
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'band'
}

const FAKE_USERS = [
  { email: 'alex.thrash@seed.local', password: 'seed123!', username: 'alexthrash', firstName: 'Alex', lastName: 'Torres', isMusician: true, isFan: true },
  { email: 'marcus.grove@seed.local', password: 'seed123!', username: 'marcusgrove', firstName: 'Marcus', lastName: 'Grove', isMusician: true, isProducer: true },
  { email: 'viktor.doom@seed.local', password: 'seed123!', username: 'viktordoom', firstName: 'Viktor', lastName: 'Black', isMusician: true, isFan: true },
  { email: 'elena.symphony@seed.local', password: 'seed123!', username: 'elenasymphony', firstName: 'Elena', lastName: 'Winters', isMusician: true, isSoundEngineer: true },
  { email: 'jake.fury@seed.local', password: 'seed123!', username: 'jakefury', firstName: 'Jake', lastName: 'Fury', isMusician: true, isFan: true },
  { email: 'nina.chaos@seed.local', password: 'seed123!', username: 'ninachaos', firstName: 'Nina', lastName: 'Chaos', isMusician: true },
  { email: 'derek.storm@seed.local', password: 'seed123!', username: 'derekstorm', firstName: 'Derek', lastName: 'Storm', isMusician: true, isProducer: true },
  { email: 'sophie.metal@seed.local', password: 'seed123!', username: 'sophiemetal', firstName: 'Sophie', lastName: 'Lane', isFan: true },
]

const BANDS_DATA = [
  { name: 'Ashes of Valor', country: 'United States', yearFormed: 2018, desc: 'Thrash metal from the Pacific Northwest. Heavy riffs and relentless energy.', genres: ['Thrash Metal'], merch: null },
  { name: 'Ruinous Dawn', country: 'Finland', yearFormed: 2020, desc: 'Melodic death metal with symphonic elements.', genres: ['Melodic Death Metal', 'Symphonic Metal'], merch: 'https://example.com/ruinous-merch' },
  { name: 'Obsidian Vale', country: 'France', yearFormed: 2019, desc: 'Atmospheric black metal with folk influences.', genres: ['Black Metal', 'Folk Metal'], merch: null },
  { name: 'Pale Horizon', country: 'Norway', yearFormed: 2017, desc: 'Raw black metal from the Norwegian underground.', genres: ['Black Metal'], merch: null },
  { name: 'Iron Covenant', country: 'Germany', yearFormed: 2015, desc: 'Power metal with epic choruses and twin guitars.', genres: ['Power Metal', 'Heavy Metal'], merch: 'https://example.com/iron-merch' },
  { name: 'Void Serpent', country: 'Sweden', yearFormed: 2021, desc: 'Progressive death metal with complex arrangements.', genres: ['Progressive Metal', 'Death Metal'], merch: null },
  { name: 'Crimson Ritual', country: 'United Kingdom', yearFormed: 2019, desc: 'Doom metal with haunting atmospheres.', genres: ['Doom Metal'], merch: null },
  { name: 'Shattered Crown', country: 'Canada', yearFormed: 2016, desc: 'Metalcore meets melodic death metal.', genres: ['Metalcore', 'Melodic Death Metal'], merch: 'https://example.com/shattered-merch' },
]

const RELEASES_DATA = [
  { title: 'Ride the Storm', type: 'album' as const, year: 2022 },
  { title: 'Demo 2021', type: 'ep' as const, year: 2021 },
  { title: 'Into the Void', type: 'album' as const, year: 2023 },
  { title: 'First Blood', type: 'single' as const, year: 2020 },
  { title: 'Eternal Night', type: 'ep' as const, year: 2022 },
  { title: 'Crown of Thorns', type: 'album' as const, year: 2024 },
  { title: 'Shadowfall', type: 'ep' as const, year: 2021 },
  { title: 'Legacy', type: 'album' as const, year: 2023 },
]

const REVIEW_TITLES = [
  'Crushing riffs!', 'Solid release', 'A true banger', 'Heavy as hell', 'Great production',
  'Metal at its finest', 'Impressive debut', 'Absolute fire', 'Incredible album',
]

const REVIEW_CONTENT = [
  'Heavy riffs and solid production. Highly recommended.',
  'These guys know how to write hooks. Can\'t stop listening.',
  'A breath of fresh air in the scene. Buy it now.',
  'The drumming alone is worth the price of admission.',
  'Finally something that doesn\'t sound like everyone else.',
]

async function main() {
  console.log('🌱 Seeding the-metalist...')

  // 1. Genres
  const genreNames = ['Thrash Metal', 'Death Metal', 'Black Metal', 'Power Metal', 'Heavy Metal', 'Doom Metal', 'Folk Metal', 'Progressive Metal', 'Symphonic Metal', 'Melodic Death Metal', 'Metalcore', 'Nu Metal']
  for (const name of genreNames) {
    const { data: ex } = await supabase.from('genres_list').select('id').eq('name', name).maybeSingle()
    if (!ex) await supabase.from('genres_list').insert({ name, is_custom: false })
  }
  const { data: genres } = await supabase.from('genres_list').select('id, name')
  const genreByName = new Map((genres || []).map(g => [g.name, g.id]))

  // 2. Influences
  const influenceNames = ['Metallica', 'Black Sabbath', 'Iron Maiden', 'Slayer', 'Megadeth', 'Pantera', 'Opeth', 'Gojira', 'Meshuggah', 'Tool', 'Lamb of God', 'Arch Enemy', 'Amon Amarth', 'Behemoth']
  for (const name of influenceNames) {
    const { data: existing } = await supabase.from('influences_list').select('id').eq('name', name).maybeSingle()
    if (!existing) await supabase.from('influences_list').insert({ name })
  }
  const { data: influences } = await supabase.from('influences_list').select('id, name')
  const influenceByName = new Map((influences || []).map(i => [i.name, i.id]))

  // 3. Create auth users + profiles
  const profileIds: string[] = []
  for (const u of FAKE_USERS) {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })
    if (error) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', u.username).maybeSingle()
      if (existing) {
        profileIds.push(existing.id)
        continue
      }
      console.warn('Could not create user', u.username, error.message)
      continue
    }
    if (user.user) {
      await supabase.from('profiles').upsert({
        id: user.user.id,
        username: u.username,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        is_musician: u.isMusician ?? false,
        is_producer: u.isProducer ?? false,
        is_sound_engineer: u.isSoundEngineer ?? false,
        is_fan: u.isFan ?? false,
      }, { onConflict: 'id' })
      profileIds.push(user.user.id)
    }
  }
  console.log('  Profiles:', profileIds.length)

  // 4. Subscriptions (varied tiers)
  const tiers: ('free' | 'bedroom' | 'pro' | 'pro_plus')[] = ['free', 'bedroom', 'pro', 'pro_plus']
  for (let i = 0; i < profileIds.length; i++) {
    const tier = tiers[i % tiers.length]
    const start = new Date()
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)
    const { error: subErr } = await supabase.from('subscriptions').insert({
      user_id: profileIds[i],
      tier,
      status: 'active',
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
    })
    if (subErr?.code === '23505') {
      await supabase.from('subscriptions').update({ tier, status: 'active', current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }).eq('user_id', profileIds[i])
    }
  }
  console.log('  Subscriptions assigned')

  // 5. Bands
  const bandIds: string[] = []
  for (let i = 0; i < BANDS_DATA.length; i++) {
    const b = BANDS_DATA[i]
    const ownerId = profileIds[i % profileIds.length]
    const slug = slugify(b.name) + '-' + i
    const genreIds = b.genres.map(g => genreByName.get(g)).filter(Boolean) as number[]

    const { data: band } = await supabase.from('bands').insert({
      user_id: ownerId,
      name: b.name,
      slug,
      country: b.country,
      year_formed: b.yearFormed,
      description: b.desc,
      genre_ids: genreIds.length ? genreIds : null,
      is_published: true,
      merch_url: b.merch,
    }).select('id').single()

    if (band) {
      bandIds.push(band.id)
      await supabase.from('band_members').insert({
        band_id: band.id,
        profile_id: ownerId,
        name: `${FAKE_USERS[i % FAKE_USERS.length]?.firstName} ${FAKE_USERS[i % FAKE_USERS.length]?.lastName}`,
        instrument: 'Vocals / Guitar',
        role: 'leader',
        status: 'approved',
        display_order: 0,
      }).then(() => {})

      const infIds = [...influenceByName.values()].slice(0, 4)
      if (infIds.length) {
        await supabase.from('band_influences').insert(
          infIds.map(influence_id => ({ band_id: band.id, influence_id }))
        ).then(() => {})
      }
    }
  }
  console.log('  Bands:', bandIds.length)

  // 6. Releases + Tracks
  const releaseIds: string[] = []
  for (let i = 0; i < bandIds.length; i++) {
    const r1 = RELEASES_DATA[i % RELEASES_DATA.length]
    const r2 = RELEASES_DATA[(i + 1) % RELEASES_DATA.length]
    for (const r of [r1, r2]) {
      const { data: rel } = await supabase.from('releases').insert({
        band_id: bandIds[i],
        title: r.title,
        release_type: r.type,
        release_year: r.year,
        published: true,
      }).select('id').single()
      if (rel) {
        releaseIds.push(rel.id)
        const trackTitles = ['Opening', 'Main Riff', 'Chorus', 'Bridge', 'Outro'].slice(0, r.type === 'single' ? 1 : r.type === 'ep' ? 4 : 5)
        for (let t = 0; t < trackTitles.length; t++) {
          await supabase.from('tracks').insert({
            release_id: rel.id,
            title: trackTitles[t],
            track_number: t + 1,
            embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          }).then(() => {})
        }
      }
    }
  }
  console.log('  Releases:', releaseIds.length)

  // 7. Reviews
  let reviewCount = 0
  for (const releaseId of releaseIds.slice(0, 20)) {
    const reviewers = profileIds.filter((_, j) => j % 2 === 0).slice(0, 3)
    for (const userId of reviewers) {
      const title = REVIEW_TITLES[reviewCount % REVIEW_TITLES.length]
      const content = REVIEW_CONTENT[reviewCount % REVIEW_CONTENT.length]
      const rating = 7 + Math.floor(Math.random() * 3)
      await supabase.from('reviews').insert({
        release_id: releaseId,
        user_id: userId,
        title,
        content,
        rating,
      }).then(() => {})
      reviewCount++
    }
  }
  console.log('  Reviews:', reviewCount)

  // 8. Ratings
  for (const releaseId of releaseIds) {
    for (const userId of profileIds.slice(0, 6)) {
      await supabase.from('ratings').insert({
        release_id: releaseId,
        user_id: userId,
        score: 6 + Math.random() * 4,
      }).then(() => {})
    }
  }
  console.log('  Ratings added')

  // 9. Follows
  for (const bandId of bandIds) {
    for (const userId of profileIds.slice(0, 5)) {
      await supabase.from('follows').insert({ band_id: bandId, user_id: userId }).then(() => {})
    }
  }
  console.log('  Follows added')

  // 10. Shows
  const cities = [
    { city: 'Seattle', country: 'United States', venue: 'The Crocodile' },
    { city: 'Portland', country: 'United States', venue: 'Crystal Ballroom' },
    { city: 'Berlin', country: 'Germany', venue: 'Cassiopeia' },
    { city: 'Oslo', country: 'Norway', venue: 'John Dee' },
    { city: 'Helsinki', country: 'Finland', venue: 'Tavastia' },
  ]
  for (let i = 0; i < bandIds.length; i++) {
    const c = cities[i % cities.length]
    const d = new Date()
    d.setDate(d.getDate() + 30 + i * 7)
    await supabase.from('shows').insert({
      band_id: bandIds[i],
      date: d.toISOString().split('T')[0],
      city: c.city,
      country: c.country,
      venue: c.venue,
      ticket_url: 'https://example.com/tix',
    }).then(() => {})
  }
  console.log('  Shows added')

  // 11. Demos (musicians)
  const musicians = profileIds.filter((_, i) => FAKE_USERS[i]?.isMusician)
  for (const pid of musicians.slice(0, 4)) {
    await supabase.from('demos').insert({
      profile_id: pid,
      title: 'Rough Mix v2',
      audio_path: `demos/${pid}/demo1.mp3`,
      visibility: 'public',
      key: 'E minor',
      tempo: 140,
    }).then(() => {})
  }
  console.log('  Demos added')

  console.log('✅ Seed complete! Refresh the site to see the new content.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
