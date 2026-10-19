/**
 * GET /nearby-anchors?lat=25.799&lng=-80.196&radius=200
 *
 * Returns artworks within `radius` meters of the given coordinates,
 * using PostGIS ST_DWithin for efficient geospatial filtering.
 * Called by the walker app's GeoAnchorEngine on each position update.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lng = parseFloat(url.searchParams.get("lng") ?? "");
    const radius = Math.min(parseFloat(url.searchParams.get("radius") ?? "200"), 1000);

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(JSON.stringify({ error: "lat and lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // PostGIS: artworks within radius meters, ordered by distance
    const { data, error } = await supabase.rpc("artworks_near", {
      user_lat: lat,
      user_lng: lng,
      radius_m: radius,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ anchors: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
