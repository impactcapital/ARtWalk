-- ARtWalk.Miami — Initial Schema
-- Requires PostGIS extension for geospatial queries

create extension if not exists postgis;

-- ── ARTISTS ──────────────────────────────────────────────────────────────────

create table artists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  display_name text not null,
  bio          text,
  website_url  text,
  instagram    text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ── DISTRICTS ─────────────────────────────────────────────────────────────────

create table districts (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,  -- 'wynwood', 'design-district', etc.
  name        text not null,
  description text,
  -- PostGIS polygon covering the district boundary
  boundary    geography(polygon, 4326),
  created_at  timestamptz not null default now()
);

-- ── ARTWORKS ─────────────────────────────────────────────────────────────────

create table artworks (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references artists(id) on delete cascade,
  district_id     uuid references districts(id),
  title           text not null,
  description     text,
  -- Physical location of the real-world anchor point
  location        geography(point, 4326) not null,
  activation_radius_m integer not null default 15,
  -- Optional: compass bearing visitor should face (0–360)
  facing_bearing  smallint check (facing_bearing between 0 and 359),
  -- GLTF/GLB asset hosted on Supabase Storage
  asset_url       text not null,
  thumbnail_url   text,
  -- Optional image target URL for image-locked experiences
  image_target_url text,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- Index for fast "artworks near me" PostGIS queries
create index artworks_location_idx on artworks using gist(location);

-- ── TRIGGER RULES (gamification constraints per artwork) ──────────────────────

create table artwork_trigger_rules (
  artwork_id                uuid primary key references artworks(id) on delete cascade,
  collaborative_min_visitors smallint,
  collaborative_radius_m     integer,
  active_hours_start         smallint check (active_hours_start between 0 and 23),
  active_hours_end           smallint check (active_hours_end between 0 and 23),
  active_days                smallint[], -- 1=Mon … 7=Sun
  global_discovery_limit     integer
);

-- ── COLLECTIBLES ─────────────────────────────────────────────────────────────

create table collectibles (
  id            uuid primary key default gen_random_uuid(),
  artwork_id    uuid not null references artworks(id) on delete cascade,
  name          text not null,
  thumbnail_url text not null,
  model_url     text,  -- GLTF for 3D preview
  max_supply    integer,  -- null = unlimited
  claimed_count integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

create table achievements (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('discovery','district','streak','rare','collaborative','collector')),
  name        text not null,
  description text not null,
  point_value integer not null default 0,
  icon_url    text
);

-- ── WALKER PROFILES ───────────────────────────────────────────────────────────

create table walker_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  display_name       text not null,
  points             integer not null default 0,
  level              smallint not null default 1,
  visit_streak_days  smallint not null default 0,
  last_visit_date    date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── VISITS ────────────────────────────────────────────────────────────────────

create table visits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  artwork_id  uuid not null references artworks(id) on delete cascade,
  visited_at  timestamptz not null default now(),
  -- GPS position at time of visit (for heatmap analytics)
  position    geography(point, 4326),
  unique (user_id, artwork_id)  -- one first-visit record; duplicates handled in edge fn
);

create index visits_artwork_idx on visits(artwork_id);
create index visits_user_idx    on visits(user_id);

-- ── WALKER ACHIEVEMENTS (join) ────────────────────────────────────────────────

create table walker_achievements (
  user_id        uuid references auth.users(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  earned_at      timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ── WALKER COLLECTIBLES (join) ────────────────────────────────────────────────

create table walker_collectibles (
  user_id       uuid references auth.users(id) on delete cascade,
  collectible_id uuid references collectibles(id) on delete cascade,
  acquired_at   timestamptz not null default now(),
  primary key (user_id, collectible_id)
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

alter table walker_profiles     enable row level security;
alter table visits              enable row level security;
alter table walker_achievements enable row level security;
alter table walker_collectibles enable row level security;

-- Walkers can only read/update their own profile
create policy "walker_profiles_self" on walker_profiles
  using (auth.uid() = user_id);

-- Walkers can insert and read their own visits
create policy "visits_self" on visits
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Walkers can read their own achievements and collectibles
create policy "walker_achievements_self" on walker_achievements
  using (auth.uid() = user_id);

create policy "walker_collectibles_self" on walker_collectibles
  using (auth.uid() = user_id);

-- Artworks are public reads
create policy "artworks_public_read" on artworks
  for select using (published_at is not null and published_at <= now());

-- Artists can manage their own artworks
create policy "artworks_artist_write" on artworks
  using (artist_id in (
    select id from artists where user_id = auth.uid()
  ));
