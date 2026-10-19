import type {
  WalkerProfile,
  Achievement,
  Collectible,
  VisitEventResult,
} from "./types.js";

const POINTS_PER_VISIT = 50;
const POINTS_FIRST_VISIT_BONUS = 150;
const STREAK_BONUS_POINTS = 75;

const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7500, 15000, 30000];

export function computeLevel(points: number): number {
  let level = 0;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (points >= threshold) level++;
    else break;
  }
  return level;
}

/**
 * Pure function — given a walker profile, artwork achievements, and an optional
 * collectible, compute what the visitor earns from this visit.
 *
 * All side effects (DB writes, real-time pushes) happen in the Edge Function
 * that calls this. Keeping the engine pure makes it fully testable.
 */
export function processVisit(params: {
  walker: WalkerProfile;
  artworkId: string;
  availableAchievements: Achievement[];
  collectible: Collectible | null;
  visitedAt: Date;
}): VisitEventResult {
  const { walker, artworkId, availableAchievements, collectible, visitedAt } = params;

  const isFirstVisit = !walker.visitedArtworkIds.includes(artworkId);
  let pointsAwarded = POINTS_PER_VISIT;

  if (isFirstVisit) pointsAwarded += POINTS_FIRST_VISIT_BONUS;

  const isStreakContinued = isConsecutiveDay(walker.lastVisitDate, visitedAt);
  if (isStreakContinued) pointsAwarded += STREAK_BONUS_POINTS;

  const updatedVisits = isFirstVisit
    ? [...walker.visitedArtworkIds, artworkId]
    : walker.visitedArtworkIds;

  const updatedPoints = walker.points + pointsAwarded;
  const updatedStreak = isStreakContinued ? walker.visitStreakDays + 1 : 1;

  const updatedProfile: WalkerProfile = {
    ...walker,
    points: updatedPoints,
    level: computeLevel(updatedPoints),
    visitedArtworkIds: updatedVisits,
    visitStreakDays: updatedStreak,
    lastVisitDate: visitedAt.toISOString().split("T")[0] ?? null,
  };

  const newAchievements = availableAchievements.filter(
    (a) =>
      !walker.earnedAchievementIds.includes(a.id) &&
      isAchievementUnlocked(a, updatedProfile)
  );

  const collectibleAwarded =
    collectible &&
    isFirstVisit &&
    (collectible.maxSupply === null ||
      collectible.claimedCount < collectible.maxSupply)
      ? collectible
      : null;

  return { pointsAwarded, newAchievements, collectibleAwarded, isFirstVisit };
}

function isAchievementUnlocked(
  achievement: Achievement,
  profile: WalkerProfile
): boolean {
  switch (achievement.kind) {
    case "discovery":
      return profile.visitedArtworkIds.length >= 1;
    case "district":
      // District completion checked server-side with artwork metadata
      return false;
    case "streak":
      return profile.visitStreakDays >= 7;
    case "collector":
      return profile.collectibleIds.length >= 5;
    default:
      return false;
  }
}

function isConsecutiveDay(lastVisitDate: string | null, now: Date): boolean {
  if (!lastVisitDate) return false;
  const last = new Date(lastVisitDate);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  return diffDays === 1;
}
