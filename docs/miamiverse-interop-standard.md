# MiamiVerse Spatial Content Interoperability Standard

Status: DRAFT 0.1 · Convener: ARtWalk.Miami · Source of truth: `docs/miamiverse-interop-standard.md` in `ClimaGo/8thwall`

## 1. Purpose

Any organization in Miami can publish scenes, objects, artworks and experiences at real-world locations so that any compliant app can discover them. We adopt Open AR Cloud (OAC) conventions instead of inventing new ones, and add a thin Miami profile on top. ARtWalk.Miami is the reference implementation.

## 2. Normative building blocks

| Concern | Standard | Notes |
|---|---|---|
| Where something is | OGC GeoPose 1.0 | WGS84 `lon`, `lat`, `h` (meters) plus quaternion. |
| What something is | OAC OSCP Spatial Content Record (SCR) | JSON, `type: "scr"`, one record per content item. |
| How it is found | OAC Spatial Content Discovery (SCD) | Clients query by H3 hexagon (resolution 8) so exact location is not disclosed. |
| Fine localization (optional) | OAC GeoPose Protocol / OpenVPS | Phone sends a camera image and gets a GeoPose back. |
| Message bus (future) | SpatialDDS | 1.7 stable, 1.8 draft. Not required for conformance. |
| 3D assets | glTF 2.0 (`model/gltf-binary`) | Required for `virtual-asset` content. |

## 3. Miami profile of the SCR

Every record MUST have: `content.id`, `content.type`, `content.title`, `content.geopose`.
Every record SHOULD have: `content.keywords`, `content.refs`.

**Identifiers.** `content.id` is `<tenant>:<kind>:<local-id>`, for example `artwalk:artwork:3f2a...`.

**Keywords.** Include `miamiverse` plus the tenant tag. Add a neighborhood tag (`wynwood`, `design-district`, `little-havana`) where known.

**Types.**

| `content.type` | Meaning |
|---|---|
| `virtual-asset` | A 3D or 2D object anchored in space (artwork, sculpture overlay, marker). |
| `experience` | A walk-up interaction such as a mission, tour stop or game node. Resolves to a web URL in `refs`. |
| `scene` | A grouped set of assets. Members are listed as SCR ids in `definitions.<tenant>.members`. |

These values are a proposed convention. OAC does not define a closed list for `type`.

**Tenant extension data.** Anything not in OSCP goes under `content.definitions["<tenant-domain>"]`, for example `definitions["artwalk.miami"].activationRadiusM`. Consumers MUST ignore definitions keys they do not recognize.

**Orientation.** Where an artwork has a facing direction, the quaternion encodes a rotation about the up axis equal to the compass bearing, in an ENU frame.

## 4. Publication

A tenant publishes records in one of two ways:

1. **Feed (minimum bar).** A public HTTPS JSON endpoint returning `{ records: SpatialContentRecord[] }` with CORS enabled. ARtWalk: `GET https://artwalk.miami/api/scr`.
2. **SCD node (full bar).** Register records with a Miami GeoZone SCD node using a tenant JWT. Node operation is TBD (see section 7).

## 5. Privacy and safety

- Clients MUST NOT send exact coordinates to discovery nodes. Use H3 cells.
- Records MUST NOT include personal data about visitors. Observation data from citizen science stays in separate, validated, CC-BY-4.0 datasets.
- Artwork records need artist consent and a rights statement in `definitions`.

## 6. Reference implementation (ARtWalk.Miami)

- Package: `packages/spatial-content` (`artworkToScr`, `missionPinToScr`)
- Endpoint: `apps/walker/src/app/api/scr/route.ts`
- Sources: `artworks_near` and `mission_pins_near` PostGIS functions
- Example record:

```json
{
  "type": "scr",
  "content": {
    "id": "artwalk:artwork:0042",
    "type": "virtual-asset",
    "title": "Wynwood Wall Mural AR layer",
    "keywords": ["artwalk-miami", "miamiverse", "artwork"],
    "refs": [{ "contentType": "model/gltf-binary", "url": "https://artwalk.miami/assets/0042.glb" }],
    "geopose": {
      "position": { "lon": -80.1994, "lat": 25.8012, "h": 0 },
      "quaternion": { "x": 0, "y": 0, "z": 0, "w": 1 }
    },
    "definitions": { "artwalk.miami": { "activationRadiusM": 15 } }
  }
}
```

## 7. Open questions (for OpenMiami alignment)

- [ ] Which OpenMiami event, venue and place schemas must `experience` records link to? (OpenMiami events calendar scraper output is the first candidate.)
- [ ] Who runs the Miami GeoZone SCD node, and who issues tenant credentials?
- [ ] Shared neighborhood vocabulary and boundaries.
- [ ] Licensing defaults for published records (proposal: CC-BY-4.0 for metadata, per-asset license for models).
- [ ] Whether to pilot OpenVPS scans in Wynwood.
- [ ] Governance: change process, versioning, who signs off on new `content.type` values.

## 8. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-18 | First draft from OAC review. |
