import type { GeoAnchor, AnchorMatch, DevicePosition, Coordinates } from "./types.js";

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance in meters between two WGS84 coordinates */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

  const s =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Initial compass bearing from point a to point b in degrees (0–360) */
export function bearingDegrees(a: Coordinates, b: Coordinates): number {
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * GeoAnchorEngine — query a candidate set of anchors and rank by proximity.
 *
 * The engine does NOT call the network itself. The caller supplies candidate
 * anchors (fetched from Supabase via PostGIS nearby query). The engine applies
 * smoothed device position and returns ranked matches. This keeps the engine
 * testable without mocking fetch.
 */
export class GeoAnchorEngine {
  /** Exponential moving average alpha for GPS smoothing (0–1, lower = smoother) */
  private readonly smoothingAlpha: number;
  private smoothed: DevicePosition | null = null;

  constructor({ smoothingAlpha = 0.3 }: { smoothingAlpha?: number } = {}) {
    this.smoothingAlpha = smoothingAlpha;
  }

  /**
   * Feed a new raw GPS reading. Returns the smoothed position.
   * Readings with accuracy > 50m are weighted less in the EMA.
   */
  updatePosition(raw: DevicePosition): DevicePosition {
    if (!this.smoothed) {
      this.smoothed = raw;
      return raw;
    }

    // Weight alpha by GPS accuracy: poor accuracy → use more of the old position
    const weight = raw.accuracyMeters > 50
      ? this.smoothingAlpha * 0.4
      : this.smoothingAlpha;

    this.smoothed = {
      coords: {
        latitude:
          this.smoothed.coords.latitude * (1 - weight) +
          raw.coords.latitude * weight,
        longitude:
          this.smoothed.coords.longitude * (1 - weight) +
          raw.coords.longitude * weight,
        altitude:
          raw.coords.altitude !== undefined && this.smoothed.coords.altitude !== undefined
            ? this.smoothed.coords.altitude * (1 - weight) + raw.coords.altitude * weight
            : raw.coords.altitude,
      },
      compassHeading: raw.compassHeading,
      accuracyMeters: raw.accuracyMeters,
      timestamp: raw.timestamp,
    };

    return this.smoothed;
  }

  /**
   * Match candidate anchors against the current smoothed position.
   * Returns matches sorted by distance ascending.
   */
  matchAnchors(candidates: GeoAnchor[]): AnchorMatch[] {
    if (!this.smoothed) return [];

    const pos = this.smoothed.coords;

    return candidates
      .map((anchor): AnchorMatch => {
        const distanceMeters = haversineMeters(pos, anchor.coords);
        const bearing = bearingDegrees(pos, anchor.coords);
        return {
          anchor,
          distanceMeters,
          bearingDegrees: bearing,
          isActive: distanceMeters <= anchor.activationRadius,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  get currentPosition(): DevicePosition | null {
    return this.smoothed;
  }
}
