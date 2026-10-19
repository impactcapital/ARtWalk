import type { ObservationDataType } from "@artwalk/citizen-science";

export type MissionDifficulty = "easy" | "medium" | "hard" | "epic";

/**
 * A mission template defines a repeatable data-collection task.
 * Instances are placed geographically like PokeStops.
 */
export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  difficulty: MissionDifficulty;
  dataType: ObservationDataType;
  /** Base XP awarded for completion */
  baseXp: number;
  /** SciStarter project ID to cross-credit participation */
  sciStarterProjectId?: number;
  /** iNaturalist project slug to tag observations */
  iNaturalistProjectSlug?: string;
  /** Required photo evidence */
  requiresPhoto: boolean;
  /** Form fields the walker must fill in */
  fields: MissionField[];
  /** Icon shown on the map (emoji or URL) */
  icon: string;
  /** Accent color for the mission card */
  color: string;
}

export interface MissionField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "species_search";
  required: boolean;
  options?: string[];   // for select fields
  unit?: string;        // e.g. "cm", "°F"
  min?: number;
  max?: number;
}

/** A specific mission instance placed at a geographic location */
export interface MissionPin {
  id: string;
  templateId: string;
  template: MissionTemplate;
  lat: number;
  lng: number;
  /** Activation radius in meters */
  activationRadius: number;
  /** How many times this pin has been completed total */
  completionCount: number;
  /** Whether this walker has already completed it today */
  completedByWalkerToday?: boolean;
  /** Expiry — null means permanent */
  expiresAt?: string;
}

/** Result of completing a mission */
export interface MissionResult {
  xpAwarded: number;
  bonusXp: number;
  bonusReason?: string;
  newLevel?: number;
  observationId: string;
  /** Whether this data point hit the validation threshold */
  dataValidated: boolean;
}

/** Walker XP state */
export interface WalkerXP {
  userId: string;
  totalXp: number;
  level: number;
  weeklyXp: number;
  missionsCompleted: number;
  observationsValidated: number;
  /** University/org affiliation for team leaderboards */
  teamId?: string;
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
  missionsCompleted: number;
  teamName?: string;
  districtSlug?: string;
}

export type LeaderboardScope = "city" | "district" | "team" | "university";
export type LeaderboardPeriod = "weekly" | "monthly" | "alltime";
