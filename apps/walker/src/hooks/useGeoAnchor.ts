"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GeoAnchorEngine } from "@artwalk/geo-anchor";
import type { AnchorMatch, DevicePosition } from "@artwalk/geo-anchor";
import { supabase } from "@/lib/supabase";

const POLL_INTERVAL_MS = 3_000;
const NEARBY_RADIUS_M  = 200;

export function useGeoAnchor() {
  const engine = useRef(new GeoAnchorEngine());
  const [matches, setMatches] = useState<AnchorMatch[]>([]);
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAndMatch = useCallback(async (pos: DevicePosition) => {
    const { data, error: rpcError } = await supabase.rpc("artworks_near", {
      user_lat: pos.coords.latitude,
      user_lng: pos.coords.longitude,
      radius_m: NEARBY_RADIUS_M,
    });

    if (rpcError || !data) return;

    const candidates = data.map((row) => ({
      id: row.id,
      coords: { latitude: row.lat, longitude: row.lng },
      activationRadius: row.activation_radius_m,
      facingBearing: row.facing_bearing ?? undefined,
      artworkId: row.id,
    }));

    setMatches(engine.current.matchAnchors(candidates));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (geo) => {
        const raw: DevicePosition = {
          coords: {
            latitude: geo.coords.latitude,
            longitude: geo.coords.longitude,
            altitude: geo.coords.altitude ?? undefined,
          },
          accuracyMeters: geo.coords.accuracy,
          timestamp: geo.timestamp,
        };

        const smoothed = engine.current.updatePosition(raw);
        setPosition(smoothed);
        await fetchAndMatch(smoothed);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 10_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [fetchAndMatch]);

  const activeMatch = matches.find((m) => m.isActive) ?? null;

  return { matches, activeMatch, position, error };
}
