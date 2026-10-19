/**
 * GET /nearby-missions?lat=25.799&lng=-80.196&radius=300
 *
 * Returns mission pins near the walker with their templates,
 * annotated with whether the walker already completed each today.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  const url = new URL(req.url);
  const lat    = parseFloat(url.searchParams.get("lat") ?? "");
  const lng    = parseFloat(url.searchParams.get("lng") ?? "");
  const radius = Math.min(parseFloat(url.searchParams.get("radius") ?? "300"), 1000);

  if (isNaN(lat) || isNaN(lng)) {
    return new Response(JSON.stringify({ error: "lat and lng required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );

  const { data: { user } } = authHeader
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  // Nearby pins via PostGIS
  const { data: pins, error } = await supabase.rpc("mission_pins_near", {
    user_lat: lat,
    user_lng: lng,
    radius_m: radius,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch templates for found pins
  const templateIds = [...new Set((pins ?? []).map((p: { template_id: string }) => p.template_id))];
  const { data: templates } = templateIds.length
    ? await supabase.from("mission_templates").select("*").in("id", templateIds)
    : { data: [] };

  const templateMap = Object.fromEntries(
    (templates ?? []).map((t: { id: string }) => [t.id, t])
  );

  // Check today's completions for this walker
  const today = new Date().toISOString().split("T")[0];
  let completedTodayIds = new Set<string>();

  if (user) {
    const { data: completions } = await supabase
      .from("mission_completions")
      .select("mission_pin_id")
      .eq("walker_user_id", user.id)
      .gte("completed_at", `${today}T00:00:00Z`);

    completedTodayIds = new Set(
      (completions ?? []).map((c: { mission_pin_id: string }) => c.mission_pin_id)
    );
  }

  const missions = (pins ?? []).map((pin: Record<string, unknown>) => ({
    ...pin,
    template: templateMap[pin["template_id"] as string] ?? null,
    completed_today: completedTodayIds.has(pin["id"] as string),
    is_active: (pin["distance_m"] as number) <= (pin["activation_radius_m"] as number),
  }));

  return new Response(JSON.stringify({ missions }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
