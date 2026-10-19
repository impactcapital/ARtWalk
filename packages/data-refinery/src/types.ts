import type { ObservationDataType } from "@artwalk/citizen-science";

/**
 * The five stages of the data refinery pipeline.
 * Mirrors the SSIR model: Collect → Classify → Validate → Analyze → Distribute.
 */
export type RefineryStage =
  | "collected"     // raw submission, unverified
  | "classified"    // data type confirmed, schema validated
  | "validated"     // ≥3 independent walkers confirmed
  | "enriched"      // cross-referenced with gov/university data
  | "published";    // included in an exported data package

/** A curated dataset ready for external distribution */
export interface DataPackage {
  id: string;
  title: string;
  description: string;
  dataType: ObservationDataType;
  /** Miami-Dade or city/district boundary this covers */
  geographicScope: string;
  /** ISO date range covered */
  startDate: string;
  endDate: string;
  /** Number of validated observations included */
  observationCount: number;
  /** Data quality score 0–100 */
  qualityScore: number;
  /** Organizations that reviewed/enriched this package */
  reviewedBy: string[];
  /** License for the data */
  license: "cc-by-4.0" | "cc-by-sa-4.0" | "proprietary";
  /** Pricing tier */
  accessTier: "free" | "partner" | "commercial";
  /** GeoJSON download URL (Supabase Storage) */
  downloadUrl?: string;
  createdAt: string;
}

/** GeoJSON feature representing a single validated observation for export */
export interface ObservationFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    dataType: ObservationDataType;
    observedAt: string;
    confidenceScore: number;
    validationCount: number;
    iNaturalistId?: number;
    data: Record<string, unknown>;
  };
}

export interface ObservationFeatureCollection {
  type: "FeatureCollection";
  features: ObservationFeature[];
  metadata: {
    generatedAt: string;
    observationCount: number;
    avgConfidence: number;
    dataType: ObservationDataType;
    boundingBox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  };
}
