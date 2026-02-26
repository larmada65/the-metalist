# The Metalist — Product Roadmap
*Look · Feel · User Experience*

---

## PHASE 1 — Visual Foundation
*Highest impact for lowest effort. Mostly CSS/typography. Do this before anything else.*

### 1.1 Typography Upgrade
- **Display font for headings**: Import a heavy metal-adjacent typeface (e.g. Bebas Neue, Black Han Sans, or Oswald Black) via `next/font/google`. All `font-black uppercase` headings should use it. Keeps the brutalist aesthetic but gives it a distinct identity instead of just "bold system font".
- **Body text legibility**: Increase base line-height from `leading-normal` → `leading-relaxed` globally. Reviews/bios/descriptions are currently tight and hard to read at length.
- **Monospace for stats/numbers**: Use a tabular-nums font feature (`font-variant-numeric: tabular-nums`) on all stat numbers (followers, ratings, track counts) so they don't jump width as values update.

### 1.2 Color & Depth
- **Red accent consistency**: The red is used both as a CTA color and as a hover/accent. Define two shades: `red-600` for primary actions only, `red-500` for hover states and accents. This creates clearer visual hierarchy.
- **Surface depth**: Right now everything is either `bg-black` or `bg-zinc-900`. Add a third layer: `bg-zinc-950` for cards on `bg-black` pages (avoids the flat, textureless look). This is already partially done on the band carousel cards — apply it globally.
- **Subtle border gradients on hero sections**: Band page hero and homepage hero could use `border-b border-zinc-800/50` instead of a hard `border-zinc-800`. Softer transitions between sections.
- **Noise/grain texture overlay**: A 2-3% SVG noise texture on the page background gives depth without changing the color scheme. Very subtle — only visible on large flat areas.

### 1.3 Card Design System
- **Consistent card anatomy**: All cards should have the same skeleton: cover/logo → title → metadata → footer stats. Currently some cards have footers, some don't. Standardize.
- **Cover art treatment**: Release covers and band logos should always render in `aspect-square` with `object-cover`. Avoid letterboxing/pillarboxing by always cropping to square. Band logos on the carousel should be `object-contain` with padding (already done) but releases should always be `object-cover`.
- **Hover elevation**: Cards on hover should feel "lifted". Instead of just `border-zinc-700`, add `hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5 transition-all` for a physical lift sensation.
- **Rating badges**: The score badges (`15.0`, `8.5/20`) should be more prominent on cards — slightly larger, always top-right corner on cover art, consistent across all release cards.

### 1.4 Empty States & Zero Data
- **Personality in empty states**: Replace generic "No results" with metal-flavored copy. Examples:
  - No bands: "No bands yet. Be the first to raise the horns."
  - No reviews: "The silence is deafening. Write the first review."
  - No shows: "No shows on the horizon. The tour bus is parked."
- **Illustration or iconography**: Each empty state should have a large (5xl–6xl) custom emoji or SVG icon that matches its context, not just `🤘` for everything.

### 1.5 Global Spacing & Layout
- **Section rhythm**: All homepage sections use `py-16`. Reduce alternating sections to `py-12` for visual rhythm variation — not every section is equal weight.
- **Max-width consistency**: Some pages use `max-w-5xl`, some `max-w-3xl`, some `max-w-6xl`. Establish a clear rule: content-heavy pages (band page, explore) → `max-w-5xl`; focused pages (rankings, dashboard) → `max-w-3xl`; full-bleed pages → `max-w-6xl`.

---

## PHASE 2 — Interactions & Feel
*How the UI responds to the user. Animation, feedback, transitions.*

### 2.1 Toast Notification System
- **Why**: Currently when you follow a band, rate a release, or approve a member, there's no visible confirmation outside the button state change. Users feel uncertain.
- **What**: A lightweight toast (no library needed — 30 lines of CSS + React context):
  - `+ Following Metallica` (green, bottom-left, auto-dismisses in 3s)
  - `Rating saved: 14.5 / 20` (neutral, bottom-left)
  - `Request approved` (green)
  - `Something went wrong — try again` (red)
- **Placement**: Bottom-left on desktop, bottom-center on mobile (clear of thumb zone).

### 2.2 Optimistic UI for Social Actions
- **Follow/unfollow**: Should toggle instantly. Currently there's a `followLoading` state that disables the button and shows `...`. Instead, toggle the state immediately (optimistic), then revert on error with a toast.
- **Ratings**: Same pattern — apply the rating visually before the DB write confirms.
- **Member approval/rejection**: Remove from pending list immediately on click.

### 2.3 Page Transitions
- **Next.js View Transitions API**: Add `next/navigation` view transitions to all `<Link>` navigations. A simple cross-fade (200ms) between pages eliminates the hard white flash on navigation and makes the app feel more cohesive.
- **List item entrance**: When a grid/list loads (releases, members, bands), items should stagger-fade in using CSS `animation-delay` increments (`delay-0`, `delay-75`, `delay-150`...) on the first 6 items. Beyond that, no delay.

### 2.4 Skeleton Loaders — Comprehensive Pass
- **Homepage auth skeleton**: Already done for CTA buttons. Extend to the GlobalNav username area (replace `Hey, [username]` while loading with a `w-20 h-3 bg-zinc-800 rounded animate-pulse`).
- **Band page loading state**: Currently shows `Loading...` centered on the page. Replace with a full skeleton that matches the band page layout: a hero-height grey block, a row of fake stat pills, a fake releases grid.
- **Dashboard loading state**: Replace the blank page-behind-loading-spinner with inline skeleton rows for band cards.

### 2.5 Micro-interactions
- **Follow button**: On follow, play a brief scale pulse (`scale-110` → `scale-100` over 150ms). On unfollow, no animation (neutral action).
- **Rating widget**: Stars/sliders should have haptic-like feedback via CSS `transition-transform` on each segment.
- **Copy to clipboard** (band links, show links): Add a "Copied!" tooltip state that fades after 2s.
- **Carousel dots**: Already animated. Good.

### 2.6 Mobile Bottom Navigation
- **Problem**: On mobile the GlobalNav becomes a hamburger. The most common actions (Home, Explore, Feed, Dashboard) require opening a menu.
- **Solution**: For logged-in users on mobile, show a sticky bottom nav bar with 4 icons: Home, Explore, Feed, Dashboard/Profile. Keep the top nav for branding and search only.
- **Design**: `fixed bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 flex justify-around py-3 md:hidden z-40`

---

## PHASE 3 — Page-Level Experience Redesigns
*Individual pages that need more than polish — they need rethinking.*

### 3.1 Band Page — Immersive Hero
- **Current problem**: The hero is a row of: small logo → text info. It works but doesn't make the band feel special.
- **Target**: Full-width hero section with band photo as background (blurred, darkened), logo as a floating element overlaid bottom-left, band name in large display font across the image. Think Spotify's artist page treatment but in black/red.
- **Implementation**: `band_pic_url` is already fetched. Use it as a full-bleed `bg-cover` div with `brightness-25` filter. Logo floats in bottom-left with a drop shadow. Band name overlays the image in 6xl–8xl display font.
- **Sticky band name on scroll**: Once you scroll past the hero, the band name appears in the nav bar (like a "context header"). Uses `IntersectionObserver`.

### 3.2 Release Detail Pages — Full Treatment
- **Current state**: `/releases/[id]` exists but may be minimal.
- **Target design**:
  - Large cover art left column (sticky on desktop)
  - Right column: title, band name link, year, type, avg rating (VU meter), rating count
  - Track listing below with: number, title, duration, individual ratings if available
  - Embedded player (YouTube/SoundCloud) if the release has a video_url
  - Reviews section below the tracklist
  - "Rate this release" widget (0–20 slider or star picker)
  - Related releases from same band at bottom

### 3.3 Explore Page — Smarter Discovery
- **Current state**: List of bands with influence/genre filter.
- **Missing**: No way to see "similar bands to X", no visual variety in the list.
- **Improvements**:
  - Add "Random" button that picks a random band — metalheads love discovery
  - Add follower count as a visual bar (thin red line under each band name, proportional to max followers on page)
  - Pinned "Featured band of the week" at top (admin-set, stored in Supabase)
  - Show influence tags on each band card in the list (2-3 influences per band as grey pills)

### 3.4 Homepage — More Dynamic
- **Stats**: The `bands / releases / members` stats are static. Make them feel live: animate count-up on first render using a simple `useInterval` counter that ticks from 0 to the real value over 800ms.
- **"What's happening"**: Add a thin activity strip between hero and new bands carousel — a horizontally scrolling list of recent micro-events: "larmada rated Ride the Lightning 18.5", "New band: Ashes of Valor from Brazil", "3 new shows added this week". Data from Supabase, cached for 5 min.
- **Genre quick-links**: Below the hero, a horizontally scrollable row of genre pills that link to `/explore?genre=X`. Gives visitors instant drill-down into what they like.

### 3.5 Member Profiles — Richer Pages
- **Current state**: `/members/[username]` exists.
- **Missing depth**:
  - Activity feed on the profile (recent ratings, reviews, follows)
  - Bands they're in (member cards)
  - Their review history with scores
  - "Listening taste" — genre breakdown based on bands they follow
  - Social link (if set) — Instagram, Bandcamp

---

## PHASE 4 — Social & Community Features
*What turns visitors into regular users.*

### 4.1 In-App Notifications
- **Bell icon** in GlobalNav with unread count badge
- **Notification types**:
  - New release from a band you follow
  - New show from a band you follow
  - Someone rated/reviewed a release you rated
  - Your band join request was approved/rejected
  - Someone followed you
- **Storage**: `notifications` table in Supabase, `is_read` bool, created by DB triggers or server actions
- **Dropdown panel**: Latest 10, "Mark all read" button, links to relevant content

### 4.2 Band Following Feed
- **Current state**: `/feed` exists but may be minimal
- **Target**: A ranked chronological feed of:
  - New releases from followed bands (cover art card)
  - Upcoming shows from followed bands (date card)
  - Recent reviews of releases from followed bands
  - New members in followed bands
- **Design**: Infinite scroll (or "Load more"), grouped by day ("Today", "This week", "Earlier")

### 4.3 Comments on Releases
- Short (280 char max) threaded comments on release pages
- Upvote/downvote (simple count, no auth-heavy system)
- Replying to a comment (1 level deep — no infinite nesting)
- Moderation: band leader can delete comments on their releases

### 4.4 Social Sharing
- Each band page, release page, and review should have a "Share" button
- Generates a pre-filled share URL (just copy to clipboard)
- **OpenGraph meta tags** on all dynamic pages: `og:title`, `og:description`, `og:image` (use band logo or release cover). This makes shared links on Discord/WhatsApp/Twitter show rich previews.
- `/api/og` route using `@vercel/og` to generate dynamic OG images server-side

---

## PHASE 5 — Power Features
*For band leaders and engaged users.*

### 5.1 Band Page Customization
- **Accent color**: Band leader can pick a custom accent color (replaces red on their band page only). Stored in `bands.accent_color`. Applied via inline CSS variable: `--band-accent: #hex`.
- **Bio formatting**: Support basic Markdown in band bio (bold, italic, links). Currently plain text.
- **Pinned release**: Band leader can pin one release to always show at top of discography.

### 5.2 Enhanced Band Analytics
- **Traffic**: Page views over time (tracked via a simple `band_page_views` table, incremented server-side)
- **Audience geography**: Where followers are located (country breakdown from profiles)
- **Release performance chart**: Ratings over time per release (how scores shift as more people rate)
- **Best posting time**: When followers are most active (hourly distribution of ratings/follows)

### 5.3 Discography Timeline View
- Alternative to the grid view of releases: a vertical timeline (year → releases in that year) showing the band's progression
- Toggle between grid and timeline via an icon button
- Shows gaps in discography clearly

### 5.4 Band Comparison Tool — Polish
- Currently exists. Add:
  - Radar chart (5 axes: followers, releases, avg rating, track count, show count)
  - "Share comparison" URL (`/compare?a=band-slug&b=band-slug`)
  - Print/screenshot mode

---

## PHASE 6 — Platform Health
*Things users don't see but feel.*

### 6.1 SEO & Meta
- `generateMetadata` on all band, release, member, and review pages
- Sitemap (`app/sitemap.ts`) for all published bands and releases
- `robots.txt`
- Structured data (JSON-LD) on band pages: `MusicGroup` schema

### 6.2 Email Notifications
- Triggered via Supabase Edge Functions + Resend (or SendGrid):
  - Welcome email on signup
  - "X new releases from bands you follow" (weekly digest)
  - "Your band got a new follower" (real-time)
  - "New review of your release" (real-time)

### 6.3 Performance
- `next/image` for all images (automatic WebP, lazy loading, blur placeholders)
- CDN cache headers on band/release pages (`Cache-Control: s-maxage=60, stale-while-revalidate=3600`)
- Route prefetching: preload band page data on hover over a band card (300ms delay)

### 6.4 Accessibility
- All icon-only buttons need `aria-label`
- Focus rings: currently `focus:outline-none` is everywhere — add `focus-visible:ring-2 focus-visible:ring-red-500` instead
- Color contrast: some `text-zinc-700` on `bg-black` fails WCAG AA — bump to `text-zinc-500` minimum for readable text
- Skip-to-content link at top of every page

---

## Priority Order (Recommended Execution)

| Phase | Effort | Impact | Do when |
|-------|--------|--------|---------|
| 1.1 Typography | Low | High | Now |
| 1.2–1.3 Color + Cards | Low | High | Now |
| 2.1 Toasts | Low | High | Now |
| 2.2 Optimistic UI | Medium | High | Now |
| 3.2 Release pages | Medium | High | Next |
| 4.1 Notifications | Medium | High | Next |
| 2.5–2.6 Micro-interactions + Mobile nav | Medium | Medium | Next |
| 3.1 Band hero redesign | Medium | High | After notifications |
| 3.4 Homepage dynamic | Medium | Medium | After band hero |
| 4.2 Feed | Medium | High | After notifications |
| 4.4 Social sharing / OG images | Low | High | Anytime |
| 6.1 SEO | Low | High | Before launch |
| 5.x Power features | High | Medium | Later |
| 6.2 Email | High | Medium | Later |
