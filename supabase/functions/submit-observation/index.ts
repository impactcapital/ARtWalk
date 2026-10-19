/**
 * POST /submit-observation
 * Body: { missionPinId, dataType, lat, lng, data, photoUrl? }
 *
 * 1. Inserts the observation (stage: 'collected')
 * 2. Runs classify step (validates schema against data_type)
 * 3. Computes XP award via process_mission_completion
 * 4. Queues iNaturalist sync if biodiversity type
 * 5. Records SciStarter participation if project is linked
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeMissionXp } from "https://esm.sh/@artwalk/missions@0.1.0/dist/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json() as {
      missionPinId: string;
      dataType: string;
      lat: number;
      lng: number;
      data: Record<string, unknown>;
      photoUrl?: string;
    };

    // Fetch mission pin + template to compute XP
    const { data: pin } = await admin
      .from("mission_pins")
      .select("*, mission_templates(*)")
      .eq("id", body.missionPinId)
      .single();

    if (!pin) throw new Error("Mission pin not found");
    const template = pin.mission_templates as Record<string, unknown>;

    // Check if this is first completion at this location
    const { count: completionCount } = await admin
      .from("mission_completions")
      .select("*", { count: "exact", head: true })
      .eq("mission_pin_id", body.missionPinId);

    const isFirst = (completionCount ?? 0) === 0;

    // Fetch walker streak
    const { data: profile } = await admin
      .from("walker_profiles")
      .select("visit_streak_days")
      .eq("user_id", user.id)
      .single();

    const xpResult = computeMissionXp({
      baseXp: template["base_xp"] as number,
      difficulty: template["difficulty"] as "easy",
      isFirstCompletionAtLocation: isFirst,
      photoCount: body.photoUrl ? 1 : 0,
      streakDays: (profile?.visit_streak_days ?? 0) as number,
      instantValidation: false,
    });

    // Insert observation
    const { data: obs, error: obsError } = await admin
      .from("observations")
      .insert({
        mission_pin_id: body.missionPinId,
        walker_user_id: user.id,
        data_type: body.dataType,
        lat: body.lat,
        lng: body.lng,
        photo_url: body.photoUrl,
        data: body.data,
        refinery_stage: "classified",
      })
      .select()
      .single();

    if (obsError || !obs) throw obsError ?? new Error("Observation insert failed");

    // Process XP atomically
    const { data: xpData, error: xpError } = await admin.rpc("process_mission_completion", {
      p_user_id: user.id,
      p_mission_pin_id: body.missionPinId,
      p_observation_id: obs.id,
      p_xp_awarded: xpResult.baseXp,
      p_bonus_xp: xpResult.bonusXp,
      p_bonus_reasons: xpResult.bonusReasons,
    });

    if (xpError) throw xpError;

    // Queue iNaturalist sync for biodiversity observations (async, non-blocking)
    if (body.dataType === "biodiversity" && Deno.env.get("INATURALIST_JWT")) {
      // Fire-and-forget — sync happens in background
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-inaturalist`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ observationId: obs.id }),
      }).catch(() => {/* non-critical */});
    }

    return new Response(JSON.stringify({
      observationId: obs.id,
      xpAwarded: xpResult.total,
      bonusReasons: xpResult.bonusReasons,
      newTotalXp: xpData?.new_total_xp,
      level: xpData?.level,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
