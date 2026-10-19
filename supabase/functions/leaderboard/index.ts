/**
 * GET /leaderboard?period=weekly&scope=city&limit=25
 * GET /leaderboard?period=alltime&scope=team&teamId=<uuid>
 * GET /leaderboard?period=weekly&scope=district&districtSlug=wynwood
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url      = new URL(req.url);
  const period   = url.searchParams.get("period") ?? "weekly";    // weekly | monthly | alltime
  const scope    = url.searchParams.get("scope") ?? "city";       // city | team | district
  const limit    = Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100);
  const teamId   = url.searchParams.get("teamId");
  const district = url.searchParams.get("districtSlug");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const view = period === "alltime" ? "leaderboard_city" : "leaderboard_weekly";

    let query = supabase
      .from(view)
      .select("*")
      .order("rank", { ascending: true })
      .limit(limit);

    if (scope === "team" && teamId) {
      query = query.eq("team_id", teamId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Re-rank if filtered by team/district (ranks from the full view don't apply)
    const entries = (data ?? []).map((row: Record<string, unknown>, i: number) => ({
      rank: scope === "city" ? row["rank"] : i + 1,
      userId: row["user_id"],
      displayName: row["display_name"],
      totalXp: row["total_xp"],
      level: row["xp_level"],
      missionsCompleted: row["missions_completed"],
      teamName: row["team_name"],
    }));

    return new Response(JSON.stringify({ period, scope, entries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
