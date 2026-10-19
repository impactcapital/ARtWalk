/** OGC GeoPose basic-ypr-free subset: WGS84 position plus quaternion orientation. */
export interface GeoPose {
  position: { lon: number; lat: number; h: number };
  quaternion: { x: number; y: number; z: number; w: number };
}

export interface SpatialContentRef {
  /** MIME type, e.g. "model/gltf-binary" */
  contentType: string;
  url: string;
}

/** Open AR Cloud OSCP Spatial Content Record `content` object. */
export interface SpatialContent {
  /** Tenant-supplied reference id */
  id: string;
  /** High-level OSCP type */
  type: string;
  title: string;
  description?: string;
  keywords?: string[];
  refs?: SpatialContentRef[];
  geopose: GeoPose;
  /** Non-OSCP extension data, namespaced by tenant */
  definitions?: Record<string, unknown>;
}

/** Spatial Content Record as exchanged with an OSCP Spatial Content Discovery node. */
export interface SpatialContentRecord {
  type: "scr";
  content: SpatialContent;
}

export interface ArtworkRow {
  id: string;
  title: string;
  asset_url: string;
  thumbnail_url?: string | null;
  activation_radius_m: number;
  facing_bearing?: number | null;
  lat: number;
  lng: number;
}

export interface MissionPinRow {
  id: string;
  template_id: string;
  activation_radius_m: number;
  lat: number;
  lng: number;
}
