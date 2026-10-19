/** A citizen science project as returned by SciStarter or our own registry */
export interface CitSciProject {
  id: string;
  externalId: string;          // SciStarter project ID or iNaturalist project slug
  source: "scistarter" | "inaturalist" | "artwalk";
  name: string;
  description: string;
  /** Which data type walkers contribute when doing missions for this project */
  dataType: ObservationDataType;
  url: string;
}

export type ObservationDataType =
  | "biodiversity"      // species sighting — syncs to iNaturalist
  | "tree_survey"       // urban tree — syncs to iTree dataset
  | "environmental"     // flood, heat, air quality — ISeeChange-style
  | "infrastructure"    // sidewalk, lighting, public art condition
  | "noise_pollution"   // sound level estimate
  | "urban_heat";       // surface temperature observation

/** Raw observation submitted by a walker */
export interface Observation {
  id: string;
  missionId: string;
  walkerUserId: string;
  dataType: ObservationDataType;
  /** GeoJSON-compatible coordinates */
  lat: number;
  lng: number;
  /** URL of photo evidence stored in Supabase Storage */
  photoUrl?: string;
  /** Structured data fields — shape depends on dataType */
  data: ObservationData;
  /** Confidence score 0–1, grows as peer validations accumulate */
  confidenceScore: number;
  validationCount: number;
  /** iNaturalist observation ID after sync, if applicable */
  iNaturalistId?: number;
  submittedAt: string;
}

export type ObservationData =
  | BiodiversityData
  | TreeSurveyData
  | EnvironmentalData
  | InfrastructureData;

export interface BiodiversityData {
  type: "biodiversity";
  /** iNaturalist taxon ID if identified */
  taxonId?: number;
  taxonName?: string;
  commonName?: string;
  count: number;
  notes?: string;
}

export interface TreeSurveyData {
  type: "tree_survey";
  species?: string;
  /** Circumference at breast height in centimeters */
  cbhCm?: number;
  condition: "excellent" | "good" | "fair" | "poor" | "dead";
  hasStreetSign: boolean;
  notes?: string;
}

export interface EnvironmentalData {
  type: "environmental";
  category: "flooding" | "heat_stress" | "air_quality" | "pollution" | "other";
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
}

export interface InfrastructureData {
  type: "infrastructure";
  category: "sidewalk" | "lighting" | "public_art" | "green_space" | "other";
  condition: "good" | "needs_attention" | "urgent";
  description: string;
}
