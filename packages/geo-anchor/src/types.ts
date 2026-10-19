export interface Coordinates {
  latitude: number;
  longitude: number;
  /** Meters above WGS84 ellipsoid */
  altitude?: number;
}

export interface GeoAnchor {
  id: string;
  coords: Coordinates;
  /** Compass bearing the visitor should face to trigger the experience (0–360) */
  facingBearing?: number;
  /** Horizontal radius in meters within which the anchor is active */
  activationRadius: number;
  /** Optional image target URL that confirms positioning (for image-locked anchors) */
  imageTargetUrl?: string;
  artworkId: string;
}

export interface AnchorMatch {
  anchor: GeoAnchor;
  /** Straight-line distance from device position in meters */
  distanceMeters: number;
  /** Compass bearing from device to anchor */
  bearingDegrees: number;
  /** Whether the device is within the activation radius */
  isActive: boolean;
}

export interface DevicePosition {
  coords: Coordinates;
  /** Device compass heading in degrees (0 = north) */
  compassHeading?: number;
  /** GPS accuracy radius in meters — used to weight smoothing */
  accuracyMeters: number;
  timestamp: number;
}
