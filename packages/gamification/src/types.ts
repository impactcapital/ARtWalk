export type AchievementKind =
  | "discovery"      // visited N artworks
  | "district"       // completed a full district
  | "streak"         // visited on consecutive days
  | "rare"           // triggered a time/weather/count gated artwork
  | "collaborative"  // participated in a multi-person unlock
  | "collector";     // acquired N collectibles

export interface Achievement {
  id: string;
  kind: AchievementKind;
  name: string;
  description: string;
  pointValue: number;
  /** Icon URL or emoji fallback */
  iconUrl?: string;
}

export interface Collectible {
  id: string;
  artworkId: string;
  /** How many exist in total — null means unlimited */
  maxSupply: number | null;
  /** How many have been claimed */
  claimedCount: number;
  name: string;
  thumbnailUrl: string;
  /** GLTF URL for the 3D collectible preview */
  modelUrl?: string;
}

export interface WalkerProfile {
  userId: string;
  displayName: string;
  points: number;
  level: number;
  visitedArtworkIds: string[];
  earnedAchievementIds: string[];
  collectibleIds: string[];
  visitStreakDays: number;
  lastVisitDate: string | null; // ISO date
}

export type VisitEventResult = {
  pointsAwarded: number;
  newAchievements: Achievement[];
  collectibleAwarded: Collectible | null;
  isFirstVisit: boolean;
};

/**
 * Rules that govern how a specific artwork can be triggered.
 * Evaluated server-side in the Supabase Edge Function.
 */
export interface ArtworkTriggerRules {
  artworkId: string;
  /** Require at least N visitors within R meters at the same time */
  collaborativeMinVisitors?: number;
  collaborativeRadiusMeters?: number;
  /** Only active during these hours (24h, local Miami time) */
  activeHoursStart?: number;
  activeHoursEnd?: number;
  /** Only active on these ISO weekday numbers (1=Mon … 7=Sun) */
  activeDays?: number[];
  /** Maximum number of times this artwork can be discovered globally */
  globalDiscoveryLimit?: number;
}
