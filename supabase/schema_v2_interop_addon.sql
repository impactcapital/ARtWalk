-- ARtWalk / MiamiVerse / FloridaVerse shared data model: v2 interoperability add-on
-- Run AFTER the v2 schema. Safe to re-run.
--
-- Aligns the model with:
--   OGC GeoPose            position (lon, lat, ellipsoidal h) + orientation quaternion
--   Open AR Cloud (OSCP)   Spatial Content Records (SCR) for discovery
--   OpenVPS                visual positioning maps and their geo-alignment
--   glTF KHR_gaussian_splatting (+ KHR_gaussian_splatting_compression_spz) delivered as
--                          glTF files or 3D Tiles tilesets, rendered by CesiumJS / Cesium for Unreal
--
-- Heights: GeoPose and 3D Tiles use WGS84 ellipsoidal height. Browser GPS altitude is not reliably
-- ellipsoidal, so treat piece/scene heights as surveyed values, not live GPS readings.

-- ---------------------------------------------------------------- vocabulary updates

alter table assets drop constraint if exists assets_kind_check;
alter table assets add constraint assets_kind_check
  check (kind in ('image','audio','video','model3d','document','splat','tileset'));

alter table external_refs drop constraint if exists external_refs_entity_type_check;
alter table external_refs add constraint external_refs_entity_type_check
  check (entity_type in ('verse','event','location','layer','piece','artist','organization','scene','vps_map'));

-- ---------------------------------------------------------------- OpenVPS maps

create table if not exists vps_maps (
  id uuid primary key default gen_random_uuid(),
  verse_id uuid not null references verses(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null,
  service_url text not null,             -- MapLocalizer endpoint that accepts GeoPose-protocol requests
  map_version text,
  alignment jsonb not null default '{}'::jsonb,  -- MapAligner output: scale, rotation, translation
  coverage geography(Polygon, 4326),
  status text not null default 'planned' check (status in ('planned','building','live','retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (verse_id, slug)
);

-- ---------------------------------------------------------------- reality-capture scenes

-- One captured scene: a Gaussian splat, mesh, point cloud or photogrammetry model with a GeoPose origin.
create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  verse_id uuid not null references verses(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  kind text not null check (kind in ('gaussian_splat','mesh','point_cloud','photogrammetry')),
  format text not null check (format in ('3dtiles','gltf','spz','ply')),
  tileset_url text,                      -- 3D Tiles tileset.json, when format = '3dtiles'
  asset_id uuid references assets(id) on delete set null,  -- single-file scene (glb, spz, ply)
  origin geography(Point, 4326) not null,
  height_m double precision not null default 0,            -- WGS84 ellipsoidal
  quat_x double precision not null default 0,
  quat_y double precision not null default 0,
  quat_z double precision not null default 0,
  quat_w double precision not null default 1,
  root_transform double precision[] check (root_transform is null or array_length(root_transform, 1) = 16),
  bounds geography(Polygon, 4326),
  splat_count bigint,
  sh_degree smallint check (sh_degree between 0 and 3),
  compression text not null default 'none' check (compression in ('none','spz')),
  gltf_extension jsonb not null default '{}'::jsonb,       -- KHR_gaussian_splatting settings, passed through as-is
  vps_map_id uuid references vps_maps(id) on delete set null,
  capture_method text check (capture_method in ('phone','drone','lidar','photogrammetry','other')),
  captured_at date,
  credit text,
  license text,
  data_source_id uuid references data_sources(id) on delete set null,
  visibility text not null default 'draft' check (visibility in ('draft','published','archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (verse_id, slug),
  check (tileset_url is not null or asset_id is not null)
);

create table if not exists scene_translations (
  scene_id uuid not null references scenes(id) on delete cascade,
  locale text not null check (locale in ('en','es','ht')),
  name text not null,
  description text,
  primary key (scene_id, locale)
);

-- ---------------------------------------------------------------- full GeoPose for pieces

alter table pieces
  add column if not exists scene_id uuid references scenes(id) on delete set null,
  add column if not exists geopose_h double precision not null default 0,
  add column if not exists quat_x double precision not null default 0,
  add column if not exists quat_y double precision not null default 0,
  add column if not exists quat_z double precision not null default 0,
  add column if not exists quat_w double precision not null default 1;

-- ---------------------------------------------------------------- indexes, triggers, security

create index if not exists scenes_origin_idx on scenes using gist (origin);
create index if not exists scenes_bounds_idx on scenes using gist (bounds);
create index if not exists vps_maps_coverage_idx on vps_maps using gist (coverage);
create index if not exists scenes_verse_idx on scenes (verse_id);
create index if not exists pieces_scene_idx on pieces (scene_id);

do $$
declare t text;
begin
  foreach t in array array['vps_maps','scenes'] loop
    execute format('drop trigger if exists %I on %I', t || '_updated_at', t);
    execute format('create trigger %I before update on %I for each row execute function set_updated_at()', t || '_updated_at', t);
  end loop;

  foreach t in array array['vps_maps','scenes','scene_translations'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', 'staff manage ' || t, t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', 'staff manage ' || t, t);
  end loop;
end $$;

drop policy if exists "public read published scenes" on scenes;
create policy "public read published scenes" on scenes
  for select using (visibility = 'published');

drop policy if exists "public read scene translations" on scene_translations;
create policy "public read scene translations" on scene_translations
  for select using (exists (select 1 from scenes s where s.id = scene_id and s.visibility = 'published'));

drop policy if exists "public read live vps maps" on vps_maps;
create policy "public read live vps maps" on vps_maps
  for select using (status = 'live');

-- ---------------------------------------------------------------- Open AR Cloud export

-- Published pieces and scenes as OSCP Spatial Content Records (a JSON array).
-- p_base_url is the public site; p_storage_base is the public Supabase Storage URL prefix,
-- used to turn asset storage paths into absolute URLs. Title and description fall back to English.
create or replace function oscp_scr(
  p_verse text default 'miamiverse',
  p_base_url text default 'https://artwalk.miami',
  p_storage_base text default null,
  p_locale text default 'en'
)
returns jsonb
language sql
stable
as $$
  with piece_records as (
    select
      p.sort_order as ord,
      jsonb_build_object(
        'type', 'scr',
        'content', jsonb_build_object(
          'id', v.slug || ':piece:' || p.id,
          'type', case when model.storage_path is not null then 'virtual-asset' else 'experience' end,
          'title', coalesce(t.title, te.title),
          'description', coalesce(t.description, te.description),
          'keywords', jsonb_build_array(v.slug, l.slug, l.kind),
          'refs', (
            select coalesce(jsonb_agg(r), '[]'::jsonb)
            from (
              select jsonb_build_object('contentType', 'text/html', 'url', p.ar_url) as r
              where p.ar_url is not null
              union all
              select jsonb_build_object('contentType', 'model/gltf-binary', 'url', p_storage_base || '/' || model.storage_path)
              where model.storage_path is not null and p_storage_base is not null
            ) x
          ),
          'geopose', jsonb_build_object(
            'position', jsonb_build_object(
              'lon', st_x(gg.g), 'lat', st_y(gg.g), 'h', p.geopose_h),
            'quaternion', jsonb_build_object(
              'x', p.quat_x, 'y', p.quat_y, 'z', p.quat_z, 'w', p.quat_w)
          ),
          'definitions', jsonb_build_object(
            v.slug, jsonb_build_object(
              'layer', l.slug,
              'layerKind', l.kind,
              'pieceSlug', p.slug,
              'artist', a.display_name,
              'sceneId', p.scene_id,
              'properties', p.properties
            )
          )
        )
      ) as rec
    from pieces p
    join layers l on l.id = p.layer_id and l.visibility = 'published'
    join verses v on v.id = l.verse_id and v.slug = p_verse
    left join locations loc on loc.id = p.location_id
    left join artists a on a.id = p.artist_id
    left join piece_translations t on t.piece_id = p.id and t.locale = p_locale
    left join piece_translations te on te.piece_id = p.id and te.locale = 'en'
    left join lateral (
      select ast.storage_path
      from piece_assets pa
      join assets ast on ast.id = pa.asset_id
      where pa.piece_id = p.id and pa.role = 'model'
      order by pa.sort_order
      limit 1
    ) model on true
    cross join lateral (select coalesce(p.geom_override, loc.geom)::geometry as g) gg
    where p.status = 'published' and gg.g is not null
  ),
  scene_records as (
    select
      s.sort_order as ord,
      jsonb_build_object(
        'type', 'scr',
        'content', jsonb_build_object(
          'id', v.slug || ':scene:' || s.id,
          'type', 'scene',
          'title', coalesce(st.name, ste.name, s.slug),
          'description', coalesce(st.description, ste.description),
          'keywords', jsonb_build_array(v.slug, s.kind, s.format),
          'refs', (
            select coalesce(jsonb_agg(r), '[]'::jsonb)
            from (
              select jsonb_build_object('contentType', 'application/json', 'url', s.tileset_url) as r
              where s.tileset_url is not null
              union all
              select jsonb_build_object('contentType', 'model/gltf-binary', 'url', p_storage_base || '/' || ast.storage_path)
              where ast.storage_path is not null and p_storage_base is not null
            ) x
          ),
          'geopose', jsonb_build_object(
            'position', jsonb_build_object(
              'lon', st_x(s.origin::geometry), 'lat', st_y(s.origin::geometry), 'h', s.height_m),
            'quaternion', jsonb_build_object(
              'x', s.quat_x, 'y', s.quat_y, 'z', s.quat_z, 'w', s.quat_w)
          ),
          'definitions', jsonb_build_object(
            v.slug, jsonb_build_object(
              'sceneKind', s.kind,
              'format', s.format,
              'compression', s.compression,
              'splatCount', s.splat_count,
              'shDegree', s.sh_degree,
              'gltfExtension', s.gltf_extension,
              'rootTransform', s.root_transform,
              'vpsService', vm.service_url,
              'license', s.license,
              'credit', s.credit
            )
          )
        )
      ) as rec
    from scenes s
    join verses v on v.id = s.verse_id and v.slug = p_verse
    left join assets ast on ast.id = s.asset_id
    left join vps_maps vm on vm.id = s.vps_map_id and vm.status = 'live'
    left join scene_translations st on st.scene_id = s.id and st.locale = p_locale
    left join scene_translations ste on ste.scene_id = s.id and ste.locale = 'en'
    where s.visibility = 'published'
  )
  select coalesce(jsonb_agg(rec order by ord), '[]'::jsonb)
  from (
    select ord, rec from piece_records
    union all
    select ord, rec from scene_records
  ) all_records;
$$;

grant execute on function oscp_scr(text, text, text, text) to anon, authenticated;
