import type { ObservationDataType } from "@artwalk/citizen-science";
import { VALIDATION_THRESHOLD } from "@artwalk/missions";

/**
 * Compute a confidence score (0–1) for an observation based on:
 * - Number of independent validators
 * - Agreement ratio among validators
 * - Whether it was cross-referenced with an authoritative source
 */
export function computeConfidence(params: {
  validationCount: number;
  /** 0–1: proportion of validators who agreed with the original submission */
  agreementRatio: number;
  hasCrossReference: boolean;  // iNaturalist ID, gov data match, etc.
  hasPhoto: boolean;
  dataType: ObservationDataType;
}): number {
  const { validationCount, agreementRatio, hasCrossReference, hasPhoto } = params;

  // Base: scale with validation count up to the threshold
  const validationScore = Math.min(validationCount / VALIDATION_THRESHOLD, 1) * 0.5;

  // Agreement quality
  const agreementScore = agreementRatio * 0.3;

  // Bonus factors
  const crossRefBonus = hasCrossReference ? 0.15 : 0;
  const photoBonus    = hasPhoto ? 0.05 : 0;

  return Math.min(validationScore + agreementScore + crossRefBonus + photoBonus, 1);
}

/** Whether an observation has crossed the publishable confidence threshold */
export function isPublishable(confidenceScore: number, dataType: ObservationDataType): boolean {
  // Different data types require different confidence thresholds before export
  const thresholds: Record<ObservationDataType, number> = {
    biodiversity:   0.65,
    tree_survey:    0.70,
    environmental:  0.60,
    infrastructure: 0.55,
    noise_pollution: 0.55,
    urban_heat:     0.60,
  };

  return confidenceScore >= (thresholds[dataType] ?? 0.65);
}
