# What To Watch Next

Personalized movie/TV recommendations to cut decision fatigue: pick your
subscribed streaming platforms, tell us what you like, and get one
confident "watch this tonight" pick instead of an endless scroll.

## Data sources

- **Catalog metadata** ([TMDB](https://www.themoviedb.org/documentation/api)) —
  titles, genres, cast, keywords, ratings. Free API.
- **Streaming availability** — also TMDB, via its `/watch/providers`
  endpoint. TMDB doesn't scrape this itself; the data is sourced from
  **JustWatch**.

  This is the **free/public option**, chosen because the client has no
  budget for a licensed data feed. It's fine for building and demoing the
  product, but worth knowing before this goes into real production use:

  - It's not a contractual data feed — no coverage or accuracy guarantees,
    and JustWatch's own terms expect attribution when their data is
    displayed (a "data provided by JustWatch" credit belongs in the UI).
  - Coverage/regions can lag or have gaps compared to a paid provider.

  **Recommendation:** if/when there's budget, switch availability data to
  [Watchmode](https://api.watchmode.com/) — a licensed, commercial-grade
  API built for exactly this. `getWatchProviders` in `src/lib/tmdb.ts`
  is the only place that would need to change.

- **"Watch Now" link.** TMDB's free API doesn't give a true per-platform
  deep link (there's no "open this exact title on Hulu" URL available
  without a paid feed) — every destination is the same TMDB "where to
  watch" page (`titles.justwatch_link`, captured during seeding —
  TMDB's own hosted page for the title, populated with provider logos,
  not actually a JustWatch URL despite the field name; falls back to
  `tmdbTitleUrl` for titles seeded before this existed or with no
  provider data). When a title is available on two or more of the
  user's own selected platforms, "Watch Now" still asks which one
  first — mainly a confirmation step, since every option opens the same
  page, which itself lists each real provider as a clickable option.

  **This is a real limitation worth flagging to the client:** true
  one-click "open this exact title on the platform I picked" deep
  linking, per platform, needs a paid data source — Watchmode (linked
  above) is the recommended upgrade path if that experience matters
  enough to justify the cost.

## Real outside ratings

Title detail pages show IMDb and Rotten Tomatoes scores alongside our own
TMDB-sourced number, via [OMDb](https://www.omdbapi.com/) (keyed off the
`imdb_id` TMDB's `external_ids` returns). Optional — set `OMDB_API_KEY`
(free tier) and apply `supabase/migrations/0006_add_ratings.sql`; without
a key, titles just render without those two numbers. Ratings are fetched
and cached once per title at ingest time (`ingestTitle` in
`src/lib/catalog.ts`), not live per page view, to stay well inside OMDb's
free daily quota — they refresh naturally as `/api/cron/refresh-catalog`
re-ingests titles over time.

## Keeping the catalog fresh

`npm run seed` is a one-time bootstrap (TMDB's "popular" lists, ~120
titles) — enough to get onboarding's taste quiz working immediately, but
small enough that an active user can exhaust it in weeks. The real,
ongoing catalog growth is `/api/cron/refresh-catalog`
(`src/app/api/cron/refresh-catalog/route.ts`): each call pages a bit
further through TMDB's much larger `/discover` endpoint (picking up
where the last call left off — `catalog_sync_state`, migration 0005)
and wraps back to the start once it's paged through everything, so the
catalog keeps both growing and refreshing rather than ever "running out."

To actually run on a schedule:

1. Apply `supabase/migrations/0005_catalog_sync_state.sql`.
2. Set `CRON_SECRET` (a random string — the route refuses to run
   without it) in your environment.
3. On Vercel: `vercel.json` already declares the schedule (daily by
   default — adjust to your plan's cron limits); set `CRON_SECRET` as a
   project environment variable too, and Vercel sends it automatically.
   Deploying elsewhere needs an equivalent external scheduler hitting
   the same route with `Authorization: Bearer <CRON_SECRET>`.

## Reliability notes

- **Rate limiting** on sign-in, sign-up, and password-reset requests
  (`src/lib/rate-limit.ts`) is in-memory — real protection for a single
  running process, but each serverless instance in a production
  multi-instance deployment (e.g. Vercel) has its own separate memory,
  so counts aren't shared across instances. Fine for now; the real
  production path once this is deployed at scale is a shared store —
  [Upstash Redis](https://upstash.com) has a free tier and a drop-in
  `@upstash/ratelimit` package built for exactly this. `checkRateLimit()`
  is the one function call sites depend on, so that's the only thing
  that would need to change.
- **Error monitoring** (Sentry or similar) isn't wired up — deliberately
  out of scope for now since it needs a real external account either
  way. Mutating Server Actions do check every Supabase call's `error`
  and either return a friendly message (for the ones with an error UI
  already, like the platform pickers) or throw (for the ones without,
  like feedback/rating actions) so a failure surfaces on the existing
  error boundary (`src/app/error.tsx`, with its retry button) instead of
  silently succeeding with nothing actually saved.

## Feasibility notes (read before extending scope)

The original product brief described "integrating directly with your
streaming platform, automatically" pulling from watch history. That's not
possible: Netflix, Hulu, Disney+, etc. do not expose a public API for a
third party to read a user's personal watch history or account. What's
built instead, to get as close to that promise as is actually buildable:

- Users **select which platforms they subscribe to** at onboarding
  (a filter, not a real account login) so recommendations only surface
  what they can actually watch.
- "Watch history" is **built inside this app** — users rate titles, skip
  ones they've seen, and build a watchlist. That's a real, first-party
  signal we're allowed to use, unlike scraping another platform's data.
- A real future integration path exists: [Trakt.tv](https://trakt.tv) has
  a legitimate public API, and a chunk of the target audience already
  uses it to track viewing across platforms. Not built for v1; the data
  model is left open to it. See `TODO.md` backlog (not committed to
  the repo — local build notes only).

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in:
   - A Supabase project's URL + anon key (+ service role key for
     server-side catalog syncing)
   - A TMDB API key
2. Run the SQL in `supabase/migrations/` against your Supabase project.
3. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test
```

Unit tests (Vitest, no live Supabase/TMDB needed — the recommendation
engine's tests inject a fake Supabase client rather than hitting a real
database) covering the logic most worth protecting from silent
regressions: password rules, TMDB provider-name normalization, the
open-redirect guard, and the recommendation engine's scoring, feedback
exclusion rules (skip cooldown vs. permanent), watchlist bonus, and
"Also Consider" genre-overlap ranking. This isn't full coverage — there
are no end-to-end/UI tests yet — but it's a real regression net for the
part of this app most expensive to get wrong silently.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- [Supabase](https://supabase.com) (Postgres + Auth)
- [TMDB](https://www.themoviedb.org) (catalog + availability, see above)
