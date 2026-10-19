import type { MissionDifficulty, WalkerXP } from "./types.js";

/** XP required to reach each level (index = level, value = cumulative XP needed) */
export const XP_THRESHOLDS = [
  0,      // L1
  500,    // L2
  1_500,  // L3
  4_000,  // L4
  9_000,  // L5
  18_000, // L6
  35_000, // L7
  65_000, // L8 — "District Champion"
  120_000,// L9
  200_000,// L10 — "Miami Data Guardian"
];

export const LEVEL_NAMES: Record<number, string> = {
  1:  "Curious Walker",
  2:  "Observer",
  3:  "Field Scout",
  4:  "Data Collector",
  5:  "District Explorer",
  6:  "Urban Naturalist",
  7:  "City Scientist",
  8:  "District Champion",
  9:  "Data Steward",
  10: "Miami Data Guardian",
};

const DIFFICULTY_MULTIPLIER: Record<MissionDifficulty, number> = {
  easy:   1.0,
  medium: 1.5,
  hard:   2.5,
  epic:   5.0,
};

export function computeXpLevel(totalXp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (totalXp >= (XP_THRESHOLDS[i] ?? 0)) level = i + 1;
    else break;
  }
  return Math.min(level, XP_THRESHOLDS.length);
}

export function xpToNextLevel(totalXp: number): { current: number; needed: number; level: number } {
  const level = computeXpLevel(totalXp);
  const nextThreshold = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1]!;
  const prevThreshold = XP_THRESHOLDS[level - 1] ?? 0;
  return {
    current: totalXp - prevThreshold,
    needed: nextThreshold - prevThreshold,
    level,
  };
}

/**
 * Compute total XP awarded for a mission completion.
 * Pure function — called both client-side (preview) and server-side (authoritative).
 */
export function computeMissionXp(params: {
  baseXp: number;
  difficulty: MissionDifficulty;
  isFirstCompletionAtLocation: boolean;
  /** Number of photo attachments — rewards effort */
  photoCount: number;
  /** Walker's current streak days */
  streakDays: number;
  /** Whether the data was auto-validated (high-confidence location) */
  instantValidation: boolean;
}): { baseXp: number; bonusXp: number; total: number; bonusReasons: string[] } {
  const base = Math.round(params.baseXp * DIFFICULTY_MULTIPLIER[params.difficulty]);
  const reasons: string[] = [];
  let bonus = 0;

  if (params.isFirstCompletionAtLocation) {
    bonus += Math.round(base * 0.5);
    reasons.push("First observation at this location (+50%)");
  }

  if (params.photoCount >= 2) {
    bonus += 25;
    reasons.push("Multi-photo evidence (+25 XP)");
  }

  if (params.streakDays >= 3) {
    const streakBonus = Math.min(params.streakDays * 10, 100);
    bonus += streakBonus;
    reasons.push(`${params.streakDays}-day streak (+${streakBonus} XP)`);
  }

  if (params.instantValidation) {
    bonus += 50;
    reasons.push("Data immediately validated (+50 XP)");
  }

  return { baseXp: base, bonusXp: bonus, total: base + bonus, bonusReasons: reasons };
}

/** XP bonus awarded when an observation reaches validation threshold */
export const VALIDATION_BONUS_XP = 75;

/** Minimum number of independent walkers needed to mark data as validated */
export const VALIDATION_THRESHOLD = 3;
