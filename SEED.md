# Seed Data

Populate the-metalist with fake profiles, bands, releases, reviews, and more.

## Prerequisites

Add your **Supabase Service Role Key** to `.env.local` (create the key if it’s missing):

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find it in [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **Settings** → **API** → **Project API keys** → `service_role` (use **Reveal** to copy the secret key).

## Run

```bash
npm run seed
```

This creates:

- **8 fake users** (alexthrash, marcusgrove, viktordoom, etc.) with auth + profiles
- **4 subscription tiers** (free, bedroom, pro, pro_plus) assigned round-robin
- **8 bands** (Ashes of Valor, Ruinous Dawn, Obsidian Vale, etc.) with releases & tracks
- **Reviews, ratings, follows, shows, demos** to make the site feel lively

All fake users have password: `seed123!` — useful for testing login.
