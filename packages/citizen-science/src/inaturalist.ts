/**
 * iNaturalist API client
 * Docs: https://api.inaturalist.org/v1/docs
 * Auth: JWT from inaturalist.org/users/api_token (24h expiry)
 * Rate limit: 100 req/min, ~10k req/day
 */

const BASE = "https://api.inaturalist.org/v1";

export interface iNatTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  rank: string;
  iconic_taxon_name: string;
  default_photo?: { medium_url: string };
}

export interface iNatObservation {
  id: number;
  quality_grade: "research" | "needs_id" | "casual";
  taxon?: iNatTaxon;
  observed_on: string;
  place_guess?: string;
}

export class iNaturalistClient {
  constructor(private readonly jwtToken?: string) {}

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.jwtToken) h["Authorization"] = `Bearer ${this.jwtToken}`;
    return h;
  }

  /** Search species by name — used in mission observation forms */
  async searchTaxa(query: string, limit = 10): Promise<iNatTaxon[]> {
    const q = new URLSearchParams({ q: query, per_page: String(limit) });
    const res = await fetch(`${BASE}/taxa?${q}`, { headers: this.headers });
    if (!res.ok) throw new Error(`iNaturalist taxa search failed: ${res.status}`);
    const json = await res.json() as { results: iNatTaxon[] };
    return json.results;
  }

  /** Fetch recent observations near a location (read — no auth required) */
  async nearbyObservations(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    taxonId?: number;
    limit?: number;
  }): Promise<iNatObservation[]> {
    const q = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
      radius: String(params.radiusKm ?? 5),
      per_page: String(params.limit ?? 20),
      order_by: "created_at",
      ...(params.taxonId ? { taxon_id: String(params.taxonId) } : {}),
    });

    const res = await fetch(`${BASE}/observations?${q}`);
    if (!res.ok) throw new Error(`iNaturalist observations failed: ${res.status}`);
    const json = await res.json() as { results: iNatObservation[] };
    return json.results;
  }

  /**
   * Submit a new observation to iNaturalist on behalf of the ARtWalk platform.
   * Requires a valid JWT. Returns the new iNaturalist observation ID.
   */
  async submitObservation(params: {
    taxonId?: number;
    observedOn: string;   // ISO date
    lat: number;
    lng: number;
    description?: string;
    photoUrls?: string[];
    tags?: string[];
  }): Promise<number> {
    if (!this.jwtToken) throw new Error("iNaturalist JWT required for submissions");

    const body = {
      observation: {
        taxon_id: params.taxonId,
        observed_on_string: params.observedOn,
        latitude: params.lat,
        longitude: params.lng,
        description: params.description,
        tag_list: [...(params.tags ?? []), "artwalk-miami"].join(","),
        geoprivacy: "open",
      },
    };

    const res = await fetch(`${BASE}/observations`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`iNaturalist submit failed: ${res.status}`);
    const json = await res.json() as { id: number };
    return json.id;
  }
}
