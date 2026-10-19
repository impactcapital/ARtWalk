"use client";

import { useGeoAnchor } from "@/hooks/useGeoAnchor";
import Link from "next/link";

export default function WalkPage() {
  const { matches, activeMatch, position, error } = useGeoAnchor();

  if (error) {
    return (
      <main style={{ padding: 28, minHeight: "100svh", display: "flex", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 8 }}>Location access needed</p>
          <p style={{ color: "var(--fg)", opacity: 0.6 }}>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>

      {/* Status bar */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontFamily: "'Arial Black', sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em" }}>
          <span style={{ color: "var(--accent)" }}>ARt</span>Walk
        </span>
        {position && (
          <span style={{ fontSize: 11, color: "var(--ar)", fontWeight: 700, letterSpacing: "0.1em" }}>
            ±{Math.round(position.accuracyMeters)}m GPS
          </span>
        )}
      </div>

      {/* Active anchor call-to-action */}
      {activeMatch && (
        <div style={{
          margin: 20,
          padding: 20,
          background: "rgba(168,240,64,0.12)",
          border: "1px solid var(--ar)",
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ar)", marginBottom: 8 }}>
            Artwork Detected · {Math.round(activeMatch.distanceMeters)}m away
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 16 }}>
            {activeMatch.anchor.artworkId}
          </p>
          <Link
            href={`/ar/${activeMatch.anchor.id}`}
            style={{
              display: "inline-flex",
              background: "var(--ar)",
              color: "#080c18",
              fontWeight: 800,
              fontSize: 14,
              padding: "12px 20px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            View in AR →
          </Link>
        </div>
      )}

      {/* Nearby list */}
      <div style={{ flex: 1, padding: "0 20px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16, marginTop: 20 }}>
          Nearby · {matches.length} found
        </p>
        {matches.length === 0 && position && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
            No artworks within 200m. Keep walking — Wynwood has over 80 murals.
          </p>
        )}
        {!position && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
            Acquiring GPS signal…
          </p>
        )}
        {matches.map((m) => (
          <div key={m.anchor.id} style={{
            padding: "16px 0",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 2 }}>
                {m.anchor.artworkId}
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                {Math.round(m.distanceMeters)}m · {Math.round(m.bearingDegrees)}°
              </p>
            </div>
            {m.isActive && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ar)", letterSpacing: "0.1em" }}>
                ACTIVE
              </span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
