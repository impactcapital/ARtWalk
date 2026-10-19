-- ARtWalk.Miami — Citizen Science, Missions, XP, Leaderboards, Data Refinery
-- Requires: 001_initial_schema.sql

-- ── PARTNER TEAMS (universities, orgs) ───────────────────────────────────────

create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  logo_url    text,
  team_type   text not null check (team_type in ('university', 'ngo', 'city', 'corporate', 'community')),
  created_at  timestamptz not null default now()
);

-- ── MISSION TEMPLATES ─────────────────────────────────────────────────────────

create table mission_templates (
  id                        text primary key,  -- e.g. 'tree-survey'
  title                     text not null,
  description               text not null,
  difficulty                text not null check (difficulty in ('easy','medium','hard','epic')),
  data_type                 text not null,
  base_xp                   integer not null,
  scistarter_project_id     integer,
  inaturalist_project_slug  text,
  requires_photo            boolean not null default true,
  fields                    jsonb not null default '[]',
  icon                      text not null default '📍',
  color                     text not null default '#A8F040',
  created_at                timestamptz not null default now()
);

-- ── MISSION PINS (placed instances) ──────────────────────────────────────────

create table mission_pins (
  id                uuid primary key default gen_random_uuid(),
  template_id       text not null references mission_templates(id),
  location          geography(point, 4326) not null,
  activation_radius_m integer not null default 30,
  completion_count  integer not null default 0,
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index mission_pins_location_idx on mission_pins using gist(location);

-- ── WALKER XP (separate from gamification points) ────────────────────────────

alter table walker_profiles
  add column if not exists total_xp          integer not null default 0,
  add column if not exists xp_level          smallint not null default 1,
  add column if not exists weekly_xp         integer not null default 0,
  add column if not exists missions_completed integer not null default 0,
  add column if not exists team_id           uuid references teams(id);

-- ── OBSERVATIONS (raw data submissions) ──────────────────────────────────────

create table observations (
  id               uuid primary key default gen_random_uuid(),
  mission_pin_id   uuid references mission_pins(id),
  walker_user_id   uuid not null references auth.users(id) on delete cascade,
  data_type        text not null,
  lat              double precision not null,
  lng              double precision not null,
  location         geography(point, 4326) generated always as
                     (st_makepoint(lng, lat)::geography) stored,
  photo_url        text,
  data             jsonb not null default '{}',
  confidence_score numeric(4,3) not null default 0,
  validation_count smallint not null default 0,
  refinery_stage   text not null default 'collected'
                   check (refinery_stage in ('collected','classified','validated','enriched','published')),
  -- External cross-references
  inaturalist_id   integer,
  scistarter_recorded boolean not null default false,
  submitted_at     timestamptz not null default now()
);

create index observations_location_idx on observations using gist(location);
create index observations_stage_idx    on observations(refinery_stage);
create index observations_walker_idx   on observations(walker_user_id);

-- ── OBSERVATION VALIDATIONS (peer review) ────────────────────────────────────

create table observation_validations (
  id              uuid primary key default gen_random_uuid(),
  observation_id  uuid not null references observations(id) on delete cascade,
  validator_user_id uuid not null references auth.users(id) on delete cascade,
  agrees          boolean not null,
  notes           text,
  validated_at    timestamptz not null default now(),
  unique (observation_id, validator_user_id)  -- one vote per validator
);

-- ── MISSION COMPLETIONS ───────────────────────────────────────────────────────

create table mission_completions (
  id              uuid primary key default gen_random_uuid(),
  mission_pin_id  uuid not null references mission_pins(id),
  walker_user_id  uuid not null references auth.users(id) on delete cascade,
  observation_id  uuid not null references observations(id),
  xp_awarded      integer not null,
  bonus_xp        integer not null default 0,
  bonus_reasons   text[],
  completed_at    timestamptz not null default now()
);

create index mission_completions_walker_idx on mission_completions(walker_user_id);
-- Prevent completing the same pin twice in one day
create unique index mission_completions_daily_uniq
  on mission_completions(mission_pin_id, walker_user_id, (completed_at::date));

-- ── XP LEDGER (append-only audit log) ────────────────────────────────────────

create table xp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  xp_delta    integer not null,
  reason      text not null,  -- 'mission_complete', 'validation_bonus', 'streak', etc.
  ref_id      uuid,           -- mission_completion_id or observation_id
  created_at  timestamptz not null default now()
);

create index xp_events_user_idx on xp_events(user_id);

-- ── LEADERBOARD MATERIALIZED VIEW ────────────────────────────────────────────
-- Refreshed periodically by a cron Edge Function

create materialized view leaderboard_city as
  select
    wp.user_id,
    wp.display_name,
    wp.total_xp,
    wp.xp_level,
    wp.missions_completed,
    wp.team_id,
    t.name as team_name,
    rank() over (order by wp.total_xp desc) as rank
  from walker_profiles wp
  left join teams t on t.id = wp.team_id
  where wp.total_xp > 0
  order by rank;

create unique index leaderboard_city_user_idx on leaderboard_city(user_id);

create materialized view leaderboard_weekly as
  select
    wp.user_id,
    wp.display_name,
    wp.weekly_xp as total_xp,
    wp.xp_level,
    wp.missions_completed,
    wp.team_id,
    t.name as team_name,
    rank() over (order by wp.weekly_xp desc) as rank
  from walker_profiles wp
  left join teams t on t.id = wp.team_id
  where wp.weekly_xp > 0
  order by rank;

create unique index leaderboard_weekly_user_idx on leaderboard_weekly(user_id);

-- ── DATA PACKAGES (curated export datasets) ───────────────────────────────────

create table data_packages (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  description        text not null,
  data_type          text not null,
  geographic_scope   text not null,
  start_date         date not null,
  end_date           date not null,
  observation_count  integer not null default 0,
  quality_score      numeric(4,1),
  reviewed_by        text[] not null default '{}',
  license            text not null default 'cc-by-4.0'
                     check (license in ('cc-by-4.0','cc-by-sa-4.0','proprietary')),
  access_tier        text not null default 'free'
                     check (access_tier in ('free','partner','commercial')),
  download_url       text,
  created_at         timestamptz not null default now()
);

-- ── DATA PACKAGE SUBSCRIPTIONS (revenue / partnerships) ──────────────────────

create table data_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  subscriber_name   text not null,
  subscriber_email  text not null,
  subscriber_type   text not null check (subscriber_type in ('university','city','ngo','commercial')),
  package_id        uuid references data_packages(id),
  -- null package_id = subscriber to all future packages of a data_type
  data_type         text,
  access_tier       text not null default 'free',
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz,
  annual_fee_usd    numeric(10,2),
  created_at        timestamptz not null default now()
);

-- ── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

-- Mission pins near a walker (PostGIS)
create or replace function mission_pins_near(
  user_lat double precision,
  user_lng double precision,
  radius_m  integer default 300
)
returns table (
  id                  uuid,
  template_id         text,
  activation_radius_m integer,
  completion_count    integer,
  expires_at          timestamptz,
  distance_m          double precision,
  lat                 double precision,
  lng                 double precision
)
language sql stable as $$
  select
    mp.id,
    mp.template_id,
    mp.activation_radius_m,
    mp.completion_count,
    mp.expires_at,
    st_distance(mp.location, st_makepoint(user_lng, user_lat)::geography) as distance_m,
    st_y(mp.location::geometry) as lat,
    st_x(mp.location::geometry) as lng
  from mission_pins mp
  where
    st_dwithin(mp.location, st_makepoint(user_lng, user_lat)::geography, radius_m)
    and (mp.expires_at is null or mp.expires_at > now())
  order by distance_m;
$$;

-- Artworks near a walker (PostGIS) — referenced by the walker app
create or replace function artworks_near(
  user_lat double precision,
  user_lng double precision,
  radius_m  integer default 200
)
returns table (
  id                  uuid,
  title               text,
  asset_url           text,
  thumbnail_url       text,
  activation_radius_m integer,
  facing_bearing      smallint,
  distance_m          double precision,
  lat                 double precision,
  lng                 double precision
)
language sql stable as $$
  select
    a.id,
    a.title,
    a.asset_url,
    a.thumbnail_url,
    a.activation_radius_m,
    a.facing_bearing,
    st_distance(a.location, st_makepoint(user_lng, user_lat)::geography) as distance_m,
    st_y(a.location::geometry) as lat,
    st_x(a.location::geometry) as lng
  from artworks a
  where
    a.published_at is not null
    and a.published_at <= now()
    and st_dwithin(a.location, st_makepoint(user_lng, user_lat)::geography, radius_m)
  order by distance_m;
$$;

-- Atomic mission completion + XP award
create or replace function process_mission_completion(
  p_user_id        uuid,
  p_mission_pin_id uuid,
  p_observation_id uuid,
  p_xp_awarded     integer,
  p_bonus_xp       integer,
  p_bonus_reasons  text[]
)
returns jsonb
language plpgsql as $$
declare
  v_total_xp    integer;
  v_new_level   smallint;
  v_completion  uuid;
begin
  -- Insert mission completion record
  insert into mission_completions
    (mission_pin_id, walker_user_id, observation_id, xp_awarded, bonus_xp, bonus_reasons)
  values
    (p_mission_pin_id, p_user_id, p_observation_id, p_xp_awarded, p_bonus_xp, p_bonus_reasons)
  returning id into v_completion;

  -- Update walker XP atomically
  update walker_profiles
  set
    total_xp          = total_xp + p_xp_awarded + p_bonus_xp,
    weekly_xp         = weekly_xp + p_xp_awarded + p_bonus_xp,
    missions_completed = missions_completed + 1,
    updated_at        = now()
  where user_id = p_user_id
  returning total_xp, xp_level into v_total_xp, v_new_level;

  -- Log to XP ledger
  insert into xp_events (user_id, xp_delta, reason, ref_id)
  values (p_user_id, p_xp_awarded + p_bonus_xp, 'mission_complete', v_completion);

  -- Increment pin completion count
  update mission_pins
  set completion_count = completion_count + 1
  where id = p_mission_pin_id;

  return jsonb_build_object(
    'xp_awarded', p_xp_awarded + p_bonus_xp,
    'new_total_xp', v_total_xp,
    'level', v_new_level,
    'completion_id', v_completion
  );
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table observations          enable row level security;
alter table observation_validations enable row level security;
alter table mission_completions   enable row level security;
alter table xp_events             enable row level security;

-- Anyone can read validated/published observations (public data)
create policy "observations_public_read" on observations
  for select using (refinery_stage in ('validated','enriched','published'));

-- Walkers read their own submissions in all stages
create policy "observations_own_read" on observations
  for select using (walker_user_id = auth.uid());

-- Walkers can submit observations
create policy "observations_insert" on observations
  for insert with check (walker_user_id = auth.uid());

-- Walkers can validate others' observations (not their own)
create policy "validations_insert" on observation_validations
  for insert with check (
    validator_user_id = auth.uid()
    and observation_id in (
      select id from observations where walker_user_id != auth.uid()
    )
  );

create policy "validations_read_own" on observation_validations
  for select using (validator_user_id = auth.uid());

create policy "completions_read_own" on mission_completions
  for select using (walker_user_id = auth.uid());

create policy "xp_events_read_own" on xp_events
  for select using (user_id = auth.uid());
