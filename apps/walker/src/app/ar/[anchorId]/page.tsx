"use client";

import { useEffect, useRef, useState } from "react";
import { createARRenderer } from "@artwalk/ar-renderer";
import type { ARRenderer } from "@artwalk/ar-renderer";
import { supabase } from "@/lib/supabase";

interface Props {
  params: { anchorId: string };
}

export default function ARPage({ params }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<ARRenderer | null>(null);
  const [status, setStatus]  = useState<"loading" | "ready" | "error">("loading");
  const [points, setPoints]  = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = createARRenderer({
      backend: "8thwall",
      apiKey: process.env.NEXT_PUBLIC_8THWALL_API_KEY,
      container: containerRef.current,
      onReady: () => setStatus("ready"),
      onError: () => setStatus("error"),
    });

    rendererRef.current = renderer;

    let cancelled = false;

    (async () => {
      try {
        await renderer.init();
        if (cancelled) return;

        // Fetch artwork details from Supabase
        const { data: artwork } = await supabase
          .from("artworks")
          .select("asset_url")
          .eq("id", params.anchorId)
          .single();

        if (cancelled || !artwork) return;

        renderer.showScene({
          anchorId: params.anchorId,
          assetUrl: artwork.asset_url,
          scale: [0.5, 0.5, 0.5],
          position: [0, 0, -2],
        });

        // Record the visit server-side (triggers gamification engine)
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject)
        );

        const { data: visitResult } = await supabase.functions.invoke("record-visit", {
          body: {
            artworkId: params.anchorId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        });

        if (visitResult?.points_awarded) {
          setPoints(visitResult.points_awarded);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      renderer.destroy();
    };
  }, [params.anchorId]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100svh" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Points toast */}
      {points !== null && (
        <div style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--ar)",
          color: "#080c18",
          fontWeight: 800,
          fontSize: 16,
          padding: "12px 24px",
          borderRadius: 40,
          whiteSpace: "nowrap",
          zIndex: 10,
        }}>
          +{points} pts
        </div>
      )}

      {status === "loading" && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}>
          <p style={{ color: "var(--ar)", fontWeight: 700, letterSpacing: "0.1em", fontSize: 13 }}>
            INITIALIZING AR…
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          background: "var(--bg)",
          padding: 28,
        }}>
          <p style={{ color: "var(--accent)", fontWeight: 700 }}>Camera access required</p>
          <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", fontSize: 14 }}>
            Allow camera access in your browser settings, then reload.
          </p>
        </div>
      )}
    </div>
  );
}
