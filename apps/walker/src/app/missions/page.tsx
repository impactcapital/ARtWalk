"use client";

import { useGeoAnchor } from "@/hooks/useGeoAnchor";
import { useMissions } from "@/hooks/useMissions";
import { LEVEL_NAMES } from "@artwalk/missions";
import Link from "next/link";

export default function MissionsPage() {
  const { position } = useGeoAnchor();
  const lat = position?.coords.latitude ?? null;
  const lng = position?.coords.longitude ?? null;
  const { missions, activeMissions, loading } = useMissions(lat, lng);

  return (
    <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ar)", marginBottom: 2 }}>
            Citizen Science
          </p>
          <h1 style={{ fontFamily: "'Arial Black', sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>
            Missions
          </h1>
        </div>
        <Link href="/leaderboard" style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(168,240,64,0.12)",
            border: "1px solid var(--ar)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ar)",
          }}>
            Leaderboard →
          </div>
        </Link>
      </div>

      {/* Active missions callout */}
      {activeMissions.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
            {activeMissions.length} Mission{activeMissions.length > 1 ? "s" : ""} Available Now
          </p>
          {activeMissions.map((m) => (
            <MissionCard key={m.id} mission={m} isActive />
          ))}
        </div>
      )}

      {/* Nearby missions */}
      <div style={{ flex: 1, padding: "20px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
          {loading ? "Scanning nearby…" : `${missions.length} Nearby · Walk closer to activate`}
        </p>
        {missions
          .filter((m) => !m.isActive)
          .map((m) => (
            <MissionCard key={m.id} mission={m} isActive={false} />
          ))}
        {!position && (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
            Enable location to discover missions near you.
          </p>
        )}
      </div>
    </main>
  );
}

function MissionCard({ mission, isActive }: { mission: MissionPin; isActive: boolean }) {
  const t = mission.template;
  if (!t) return null;

  return (
    <Link
      href={isActive ? `/missions/${mission.id}` : "#"}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{
        border: `1px solid ${isActive ? t.color : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "16px",
        marginBottom: 12,
        background: isActive ? `${t.color}12` : "transparent",
        opacity: mission.completedByWalkerToday ? 0.4 : 1,
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        cursor: isActive && !mission.completedByWalkerToday ? "pointer" : "default",
      }}>
        <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
          {t.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", lineHeight: 1.3 }}>{t.title}</p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: t.color,
                background: `${t.color}18`, padding: "2px 7px", borderRadius: 4,
              }}>
                +{t.baseXp} XP
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                {t.difficulty.toUpperCase()}
              </span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 8 }}>
            {t.description}
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isActive && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                {Math.round(mission.distanceMeters ?? 0)}m away
              </span>
            )}
            {mission.completedByWalkerToday && (
              <span style={{ fontSize: 11, color: "var(--ar)", fontWeight: 700 }}>✓ Done today</span>
            )}
            {t.sciStarterProjectId && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>
                SciStarter
              </span>
            )}
            {t.iNaturalistProjectSlug && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>
                iNaturalist
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
