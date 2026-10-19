# ARtWalk.Miami

Walk the city. Discover augmented art.

A location-aware WebAR platform layered over Miami's art districts —
Wynwood, Design District, Little Havana. Artists publish AR experiences
pinned to physical locations. Walkers discover them on foot, earn points,
and collect digital artifacts. Galleries and the city track engagement
through a real-time analytics dashboard.

---

## Monorepo Structure

```
apps/
  walker/          Next.js PWA — the walker-facing experience
packages/
  ar-renderer/     ARRenderer abstraction (8th Wall today, swappable)
  geo-anchor/      GeoAnchor Engine — GPS + compass fusion for outdoor AR
  gamification/    Gamification SDK — visits, achievements, collectibles
supabase/
  migrations/      PostgreSQL schema (PostGIS for geospatial)
  functions/       Edge Functions: nearby-anchors, record-visit
```

## Stack

| Layer | Choice | Why |
|---|---|---|
| AR rendering | 8th Wall (abstracted) | Best WebAR SLAM, no app download |
| 3D / scenes | Three.js + A-Frame | Open standard, 8th Wall native |
| Walker app | Next.js 14 (App Router) | PWA, SSR, TypeScript |
| Backend | Supabase (PostGIS) | Geospatial queries, realtime, auth |
| Maps | MapLibre GL | Open source Mapbox fork |
| Monorepo | pnpm + Turborepo | Fast installs, parallel builds |

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in SUPABASE and 8THWALL keys

# Run the walker app in dev mode
pnpm dev
```

## Key Architectural Decisions

**`ARRenderer` is an interface, not a class.** The 8th Wall SDK is abstracted
behind `packages/ar-renderer/src/types.ts`. When we switch backends (AR.js,
WebXR), no application code changes — only the implementation.

**`GeoAnchorEngine` is pure.** It takes GPS readings and candidate anchors,
returns matches. No network calls, fully testable. Supabase `artworks_near`
RPC handles the PostGIS geospatial query.

**Gamification runs server-side.** `processVisit()` in `packages/gamification`
is the pure engine. The `record-visit` Edge Function is the only path to
awarding points — the client never writes scores directly.

## Contributing

We contribute GPS anchor utilities back to AR.js and A-Frame.
Check `packages/geo-anchor` for OSS-eligible code.
