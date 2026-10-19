import { NextResponse } from "next/server";
import { artworkToScr, missionPinToScr } from "@artwalk/spatial-content";
import type { ArtworkRow, MissionPinRow } from "@artwalk/spatial-content";
import { MISSION_TEMPLATES } from "@artwalk/missions";

export const revalidate = 300;

const MIAMI = { lat: 25.7617, lng: -80.1918 };
const RADIUS_M = 60000;

async function rpc<T>(fn: string): Promise<T[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_lat: MIAMI.lat, user_lng: MIAMI.lng, radius_m: RADIUS_M }),
  });
  if (!res.ok) return [];
  return res.json() as Promise<T[]>;
}

/** Public OSCP Spatial Content Records for ARtWalk Miami artworks and EcoGo missions. */
export async function GET(req: Request) {
  const baseUrl = new URL(req.url).origin;
  const [artworks, pins] = await Promise.all([
    rpc<ArtworkRow>("artworks_near"),
    rpc<MissionPinRow>("mission_pins_near"),
  ]);

  const titles = new Map(MISSION_TEMPLATES.map((t) => [t.id, t.title]));
  const records = [
    ...artworks.map((a) => artworkToScr(a, baseUrl)),
    ...pins.map((p) => missionPinToScr(p, titles.get(p.template_id) ?? p.template_id, baseUrl)),
  ];

  return NextResponse.json(
    { standard: "OSCP SCR", geoPose: "OGC GeoPose 1.0", tenant: "artwalk.miami", records },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
