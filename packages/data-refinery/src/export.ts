import type { ObservationFeature, ObservationFeatureCollection } from "./types.js";

/**
 * Convert raw DB observation rows into a GeoJSON FeatureCollection
 * ready for download or API delivery.
 */
export function toGeoJSON(observations: Array<{
  id: string;
  lat: number;
  lng: number;
  data_type: string;
  observed_at: string;
  confidence_score: number;
  validation_count: number;
  inaturalist_id?: number;
  data: Record<string, unknown>;
}>): ObservationFeatureCollection {
  const features: ObservationFeature[] = observations.map((obs) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [obs.lng, obs.lat] },
    properties: {
      id: obs.id,
      dataType: obs.data_type as ObservationFeature["properties"]["dataType"],
      observedAt: obs.observed_at,
      confidenceScore: obs.confidence_score,
      validationCount: obs.validation_count,
      ...(obs.inaturalist_id ? { iNaturalistId: obs.inaturalist_id } : {}),
      data: obs.data,
    },
  }));

  const lngs = features.map((f) => f.geometry.coordinates[0]!);
  const lats = features.map((f) => f.geometry.coordinates[1]!);
  const avgConfidence = features.length
    ? features.reduce((s, f) => s + f.properties.confidenceScore, 0) / features.length
    : 0;

  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generatedAt: new Date().toISOString(),
      observationCount: features.length,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      dataType: (observations[0]?.data_type ?? "biodiversity") as ObservationFeature["properties"]["dataType"],
      boundingBox: [
        Math.min(...lngs),
        Math.min(...lats),
        Math.max(...lngs),
        Math.max(...lats),
      ],
    },
  };
}
