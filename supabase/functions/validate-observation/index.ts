/**
 * POST /validate-observation
 * Body: { observationId, agrees, notes? }
 *
 * Peer validation step. When ≥3 validators agree:
 * - Observation stage advances to 'validated'
 * - Confidence score is recalculated
 * - Original submitter earns validation bonus XP
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeConfidence } from "https://esm.sh/@artwalk/data-refinery@0.1.0/dist/index.js";
import { VALIDATION_THRESHOLD, VALIDATION_BONUS_XP } from "https://esm.sh/@artwalk/missions@0.1.0/dist/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const { observationId, agrees, notes } = await req.json() as {
      observationId: string;
      agrees: boolean;
      notes?: string;
    };

    // Insert validation record
    const { error: valError } = await admin
      .from("observation_validations")
      .insert({ observation_id: observationId, validator_user_id: user.id, agrees, notes });

    if (valError) throw valError;

    // Recalculate confidence
    const { data: validations } = await admin
      .from("observation_validations")
      .select("agrees")
      .eq("observation_id", observationId);

    const { data: obs } = await admin
      .from("observations")
      .select("walker_user_id, data_type, photo_url")
      .eq("id", observationId)
      .single();

    const total = validations?.length ?? 0;
    const agreeing = validations?.filter((v: { agrees: boolean }) => v.agrees).length ?? 0;
    const agreementRatio = total > 0 ? agreeing / total : 0;

    const confidence = computeConfidence({
      validationCount: total,
      agreementRatio,
      hasCrossReference: false,
      hasPhoto: !!obs?.photo_url,
      dataType: obs?.data_type as "biodiversity",
    });

    const isNowValidated = total >= VALIDATION_THRESHOLD && agreementRatio >= 0.67;

    // Update observation
    await admin
      .from("observations")
      .update({
        validation_count: total,
        confidence_score: confidence,
        ...(isNowValidated ? { refinery_stage: "validated" } : {}),
      })
      .eq("id", observationId);

    // Award validation bonus XP to original submitter
    if (isNowValidated && obs?.walker_user_id) {
      await admin.from("xp_events").insert({
        user_id: obs.walker_user_id,
        xp_delta: VALIDATION_BONUS_XP,
        reason: "validation_bonus",
        ref_id: observationId,
      });

      await admin
        .from("walker_profiles")
        .update({
          total_xp: admin.rpc("total_xp", {}),  // handled by trigger in prod
          observations_validated: admin.rpc("observations_validated", {}),
        })
        .eq("user_id", obs.walker_user_id);
    }

    return new Response(JSON.stringify({
      validationCount: total,
      confidenceScore: confidence,
      isValidated: isNowValidated,
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
