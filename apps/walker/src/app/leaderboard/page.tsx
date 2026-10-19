"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry, LeaderboardPeriod } from "@artwalk/missions";
import { LEVEL_NAMES, xpToNextLevel } from "@artwalk/missions";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/leaderboard?period=${period}&scope=city&limit=25`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" } }
    )
      .then((r) => r.json())
      .then((json: { entries: LeaderboardEntry[] }) => {
        setEntries(json.entries ?? []);
      })
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("walker_profiles")
        .select("display_name, total_xp, xp_level, missions_completed")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setMyEntry({
          rank: 0,
          userId: user.id,
          displayName: data.display_name,
          totalXp: data.total_xp,
          level: data.xp_level,
          missionsCompleted: data.missions_completed,
        });
      }
    });
  }, []);

  return (
    <main style={{ minHeight: "100svh" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0" }}>
        <Link href="/missions" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "block", marginBottom: 16 }}>
          ← Missions
        </Link>
        <h1 style={{ fontFamily: "'Arial Black', sans-serif", fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 20 }}>
          Leaderboard
        </h1>

        {/* Period toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["weekly", "monthly", "alltime"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: period === p ? "var(--ar)" : "rgba(255,255,255,0.12)",
                background: period === p ? "rgba(168,240,64,0.12)" : "transparent",
                color: period === p ? "var(--ar)" : "rgba(255,255,255,0.4)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              {p === "alltime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* My rank pinned */}
      {myEntry && (
        <div style={{
          margin: "0 20px 20px",
          padding: "16px",
          background: "rgba(168,240,64,0.08)",
          border: "1px solid rgba(168,240,64,0.3)",
          borderRadius: 10,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ar)", marginBottom: 8 }}>
            Your Standing
          </p>
          <XPBar entry={myEntry} showBar />
        </div>
      )}

      {/* Leaderboard list */}
      <div style={{ padding: "0 20px 32px" }}>
        {loading && (
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</p>
        )}
        {entries.map((entry) => (
          <div key={entry.userId} style={{
            display: "flex",
            gap: 14,
            padding: "14px 0",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            alignItems: "center",
          }}>
            <div style={{
              width: 32,
              textAlign: "center",
              fontSize: entry.rank <= 3 ? 20 : 13,
              fontWeight: 700,
              color: entry.rank <= 3 ? undefined : "rgba(255,255,255,0.3)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {MEDAL[entry.rank] ?? `#${entry.rank}`}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>
                  {entry.displayName}
                </p>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ar)", fontVariantNumeric: "tabular-nums" }}>
                  {entry.totalXp.toLocaleString()} XP
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  Lv.{entry.level} · {LEVEL_NAMES[entry.level] ?? ""}
                </span>
                {entry.teamName && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
                    · {entry.teamName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function XPBar({ entry, showBar }: { entry: LeaderboardEntry; showBar?: boolean }) {
  const { current, needed, level } = xpToNextLevel(entry.totalXp);
  const pct = Math.round((current / needed) * 100);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>
          {entry.displayName}
          <span style={{ fontSize: 11, color: "var(--ar)", marginLeft: 8 }}>Lv.{entry.level}</span>
        </p>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ar)", fontVariantNumeric: "tabular-nums" }}>
          {entry.totalXp.toLocaleString()} XP
        </span>
      </div>
      {showBar && (
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 5, overflow: "hidden" }}>
          <div style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--ar)",
            borderRadius: 4,
            transition: "width 0.6s ease",
          }} />
        </div>
      )}
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
        {LEVEL_NAMES[entry.level]} · {current.toLocaleString()} / {needed.toLocaleString()} XP to next level
      </p>
    </div>
  );
}
