"use client";

import { useEffect, useState, useCallback } from "react";
import type { MissionPin } from "@artwalk/missions";
import { supabase } from "@/lib/supabase";

export function useMissions(lat: number | null, lng: number | null) {
  const [missions, setMissions] = useState<MissionPin[]>([]);
  const [loading, setLoading]   = useState(false);

  const fetch = useCallback(async () => {
    if (lat === null || lng === null) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("nearby-missions", {
        body: null,
        headers: {},
        method: "GET",
      });

      // Edge Function is a GET, so use fetch directly
      const res = await globalThis.fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/nearby-missions?lat=${lat}&lng=${lng}&radius=300`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          },
        }
      );

      if (res.ok) {
        const json = await res.json() as { missions: MissionPin[] };
        setMissions(json.missions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetch();
    // Re-poll every 60s — missions don't change that fast
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [fetch]);

  const activeMissions = missions.filter((m) => m.isActive && !m.completedByWalkerToday);

  return { missions, activeMissions, loading, refresh: fetch };
}
