/**
 * POST /export-dataset  (partner/admin only)
 * Body: { dataType, startDate, endDate, geographicScope, accessTier }
 *
 * Generates a GeoJSON FeatureCollection of validated observations,
 * uploads to Supabase Storage, and creates a DataPackage record.
 * This is the "Distribute" step of the data refinery.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toGeoJSON, isPublishable } from "https://esm.sh/@artwalk/data-refinery@0.1.0/dist/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin-only endpoint — validate service role key header
  const serviceKey = req.headers.get("x-service-key");
  if (serviceKey !== Deno.env.get("EXPORT_SERVICE_KEY")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { dataType, startDate, endDate, geographicScope, accessTier, reviewedBy } =
      await req.json() as {
        dataType: string;
        startDate: string;
        endDate: string;
        geographicScope: string;
        accessTier?: "free" | "partner" | "commercial";
        reviewedBy?: string[];
      };

    // Fetch validated observations in date range
    const { data: rawObs, error } = await admin
      .from("observations")
      .select("id, lat, lng, data_type, submitted_at, confidence_score, validation_count, inaturalist_id, data")
      .eq("data_type", dataType)
      .in("refinery_stage", ["validated", "enriched", "published"])
      .gte("submitted_at", `${startDate}T00:00:00Z`)
      .lte("submitted_at", `${endDate}T23:59:59Z`);

    if (error) throw error;

    // Filter to publishable confidence only
    const publishable = (rawObs ?? []).filter(
      (obs: { confidence_score: number }) =>
        isPublishable(obs.confidence_score, dataType as "biodiversity")
    );

    // Convert to GeoJSON
    const geojson = toGeoJSON(
      publishable.map((obs: Record<string, unknown>) => ({
        id: obs["id"] as string,
        lat: obs["lat"] as number,
        lng: obs["lng"] as number,
        data_type: obs["data_type"] as string,
        observed_at: obs["submitted_at"] as string,
        confidence_score: obs["confidence_score"] as number,
        validation_count: obs["validation_count"] as number,
        inaturalist_id: obs["inaturalist_id"] as number | undefined,
        data: obs["data"] as Record<string, unknown>,
      }))
    );

    const fileName = `exports/${dataType}/${geographicScope}_${startDate}_${endDate}.geojson`;
    const fileContent = JSON.stringify(geojson);

    // Upload to Supabase Storage
    const { error: uploadError } = await admin.storage
      .from("data-exports")
      .upload(fileName, fileContent, {
        contentType: "application/geo+json",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = admin.storage
      .from("data-exports")
      .getPublicUrl(fileName);

    const qualityScore = Math.round(
      (publishable.reduce(
        (s: number, o: { confidence_score: number }) => s + o.confidence_score, 0
      ) / Math.max(publishable.length, 1)) * 100
    );

    // Create DataPackage record
    const { data: pkg } = await admin
      .from("data_packages")
      .insert({
        title: `${dataType.replace("_", " ")} — ${geographicScope} (${startDate} to ${endDate})`,
        description: `Validated community observations of type '${dataType}' collected via ARtWalk Miami.`,
        data_type: dataType,
        geographic_scope: geographicScope,
        start_date: startDate,
        end_date: endDate,
        observation_count: publishable.length,
        quality_score: qualityScore,
        reviewed_by: reviewedBy ?? [],
        access_tier: accessTier ?? "free",
        download_url: publicUrl,
      })
      .select()
      .single();

    return new Response(JSON.stringify({
      packageId: pkg?.id,
      observationCount: publishable.length,
      qualityScore,
      downloadUrl: publicUrl,
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
