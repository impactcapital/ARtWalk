import type {
  ArtworkRow,
  GeoPose,
  MissionPinRow,
  SpatialContentRecord,
} from "./types.js";

export const ARTWALK_KEYWORDS = ["artwalk-miami", "miamiverse"];

/** Quaternion for a rotation of `bearing` degrees clockwise from north about the up axis (ENU frame). */
export function bearingToQuaternion(bearingDeg: number): GeoPose["quaternion"] {
  const half = (-bearingDeg * Math.PI) / 360;
  return { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) };
}

export function artworkToScr(a: ArtworkRow, baseUrl: string): SpatialContentRecord {
  return {
    type: "scr",
    content: {
      id: `artwalk:artwork:${a.id}`,
      type: "virtual-asset",
      title: a.title,
      keywords: [...ARTWALK_KEYWORDS, "artwork"],
      refs: [{ contentType: "model/gltf-binary", url: a.asset_url }],
      geopose: {
        position: { lon: a.lng, lat: a.lat, h: 0 },
        quaternion: bearingToQuaternion(a.facing_bearing ?? 0),
      },
      definitions: {
        "artwalk.miami": {
          activationRadiusM: a.activation_radius_m,
          thumbnailUrl: a.thumbnail_url ?? null,
          experienceUrl: `${baseUrl}/ar/${a.id}`,
        },
      },
    },
  };
}

export function missionPinToScr(
  p: MissionPinRow,
  title: string,
  baseUrl: string
): SpatialContentRecord {
  return {
    type: "scr",
    content: {
      id: `artwalk:mission:${p.id}`,
      type: "experience",
      title,
      keywords: [...ARTWALK_KEYWORDS, "ecogo", "citizen-science", p.template_id],
      refs: [{ contentType: "text/html", url: `${baseUrl}/missions/${p.id}` }],
      geopose: {
        position: { lon: p.lng, lat: p.lat, h: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      },
      definitions: {
        "artwalk.miami": {
          activationRadiusM: p.activation_radius_m,
          missionTemplateId: p.template_id,
        },
      },
    },
  };
}
