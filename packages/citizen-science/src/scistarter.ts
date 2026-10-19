/**
 * SciStarter Participation API client
 * Docs: https://scistarter.org/api
 *
 * Three participation recording methods:
 *   1. Hashed email  — privacy-preserving, no user action required
 *   2. Link Token    — user generates token on their SciStarter dashboard
 *   3. Profile ID    — after profile lookup by hashed email or identifier
 *
 * API keys are per-person (the project manager), not per-project.
 * Fetch yours at: https://scistarter.org/api/key
 */

const BASE = "https://scistarter.org";

// ── Types ────────────────────────────────────────────────────────────────────

export type ParticipationType = "collection" | "classification" | "signup";

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [lng: number, lat: number];
}

/** Shared fields for all participation recording calls */
interface ParticipationBase {
  /** One of: collection, classification, signup */
  type: ParticipationType;
  /** Duration in seconds. Estimate if exact measurement unavailable. */
  duration?: number;
  /** Accuracy probability 0.0–1.0 (default 0.5) */
  fidelity?: number;
  /** GeoJSON Point — NOT a Feature, just the geometry object */
  where?: GeoJSONPoint;
  /** UTC timestamp: "YYYY-MM-DDTHH:MM:SS" */
  when?: string;
  /** Number of participations this report covers (default 1) */
  count?: number;
}

export interface HashedEmailParticipation extends ParticipationBase {
  /** SHA-256 hex digest of the participant's email (lowercased UTF-8) */
  hashed: string;
}

export interface LinkTokenParticipation extends ParticipationBase {
  /** Opaque token generated on user's SciStarter dashboard */
  token: string;
}

export interface ProfileEventParams {
  profileId: number;
  /** SciStarter project id (from project dashboard "Tools" tab) */
  projectId: number;
  type: ParticipationType;
  /** Duration in seconds */
  duration: number;
  where?: GeoJSONPoint;
  when?: string;
  /** Relative importance of this contribution (integer) */
  magnitude?: number;
  /** Any extra JSON metadata */
  extra?: Record<string, unknown>;
}

export interface ProfileLookupResult {
  scistarter_profile_id: number;
  result: "success" | "error";
  /** true if the hash/email matched a registered SciStarter member */
  known: boolean;
}

export interface SciStarterProject {
  id: number;
  title: string;
  url: string;
  description?: string;
  topics?: string[];
}

// ── Email hashing (Web Crypto — works in browser and Deno) ───────────────────

/**
 * SHA-256 hash of an email address, as required by SciStarter's privacy model.
 * The platform cannot identify the person from the hash alone.
 */
export async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Client ───────────────────────────────────────────────────────────────────

export class SciStarterClient {
  constructor(private readonly apiKey: string) {}

  // ── Profile lookup ─────────────────────────────────────────────────────────

  /** Look up a SciStarter profile ID by SHA-256 hashed email */
  async getProfileByHash(hashedEmail: string): Promise<ProfileLookupResult> {
    const url = `${BASE}/api/profile/id?hashed=${encodeURIComponent(hashedEmail)}&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SciStarter profile lookup failed: ${res.status}`);
    return res.json() as Promise<ProfileLookupResult>;
  }

  /** Look up a SciStarter profile ID by plain email address (sent over HTTPS, discarded after lookup) */
  async getProfileByEmail(email: string): Promise<ProfileLookupResult> {
    const url = `${BASE}/api/profile/id?identifier=${encodeURIComponent(email)}&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SciStarter profile lookup failed: ${res.status}`);
    return res.json() as Promise<ProfileLookupResult>;
  }

  // ── Participation recording ────────────────────────────────────────────────

  /**
   * Record participation using a SHA-256 hashed email.
   * Most privacy-preserving method — use this when the user is unaware of the integration.
   * IMPORTANT: must display a disclosure notification in the UI (see SciStarter docs).
   *
   * @param projectSlug  The slug from the project's SciStarter URL
   *                     e.g. "artwalk-miami" for scistarter.org/artwalk-miami
   */
  async recordParticipationByHash(
    projectSlug: string,
    params: HashedEmailParticipation
  ): Promise<void> {
    const url  = `${BASE}/api/participation/hashed/${encodeURIComponent(projectSlug)}?key=${this.apiKey}`;
    const body = new URLSearchParams({
      hashed: params.hashed,
      type:   params.type,
      ...(params.duration !== undefined ? { duration: String(params.duration) } : {}),
      ...(params.fidelity !== undefined ? { fidelity: String(params.fidelity) } : {}),
      ...(params.where    ? { where: JSON.stringify(params.where) } : {}),
      ...(params.when     ? { when:  params.when } : {}),
      ...(params.count !== undefined ? { count: String(params.count) } : {}),
    });

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });
    if (!res.ok) throw new Error(`SciStarter participation (hashed) failed: ${res.status}`);
  }

  /**
   * Record participation using a Link Token the user generated on their SciStarter dashboard.
   * The most user-controlled and opt-in approach.
   */
  async recordParticipationByToken(
    projectSlug: string,
    params: LinkTokenParticipation
  ): Promise<void> {
    const url  = `${BASE}/api/participation/link-token/${encodeURIComponent(projectSlug)}?key=${this.apiKey}`;
    const body = new URLSearchParams({
      token:    params.token,
      type:     params.type,
      duration: String(params.duration ?? 0),
      ...(params.fidelity !== undefined ? { fidelity: String(params.fidelity) } : {}),
      ...(params.where    ? { where: JSON.stringify(params.where) } : {}),
      ...(params.when     ? { when:  params.when } : {}),
      ...(params.count !== undefined ? { count: String(params.count) } : {}),
    });

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });
    if (!res.ok) throw new Error(`SciStarter participation (token) failed: ${res.status}`);
  }

  /**
   * Record a detailed activity event tied to a known SciStarter profile ID.
   * Use after getProfileByHash/getProfileByEmail confirms known = true.
   * Fire asynchronously — do NOT block the user's flow waiting for this response.
   */
  async recordEvent(params: ProfileEventParams): Promise<{ event_id: number; result: string }> {
    const url  = `${BASE}/api/record_event?key=${this.apiKey}`;
    const body = new URLSearchParams({
      profile_id: String(params.profileId),
      project_id: String(params.projectId),
      type:       params.type,
      duration:   String(params.duration),
      ...(params.where     ? { where:      JSON.stringify(params.where) } : {}),
      ...(params.when      ? { when:       params.when } : {}),
      ...(params.magnitude !== undefined ? { magnitude: String(params.magnitude) } : {}),
      ...(params.extra     ? { extra:      JSON.stringify(params.extra) } : {}),
    });

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });
    if (!res.ok) throw new Error(`SciStarter record_event failed: ${res.status}`);
    return res.json() as Promise<{ event_id: number; result: string }>;
  }

  // ── Project search ────────────────────────────────────────────────────────

  /** Find citizen science projects by keyword, topic, or location */
  async findProjects(params: {
    q?: string;
    phrase?: string;
    topic?: string;
    lat?: number;
    lng?: number;
    page?: number;
  }): Promise<{ total: number; page: number; entities: SciStarterProject[] }> {
    const q = new URLSearchParams({
      format: "json",
      key:    this.apiKey,
      ...(params.q      ? { q: params.q } : {}),
      ...(params.phrase ? { phrase: params.phrase } : {}),
      ...(params.topic  ? { topic:  params.topic } : {}),
      ...(params.lat !== undefined ? { lat: String(params.lat) } : {}),
      ...(params.lng !== undefined ? { lng: String(params.lng) } : {}),
      ...(params.page !== undefined ? { page: String(params.page) } : {}),
    });

    const res = await fetch(`${BASE}/p/finder?${q}`);
    if (!res.ok) throw new Error(`SciStarter project search failed: ${res.status}`);
    return res.json() as Promise<{ total: number; page: number; entities: SciStarterProject[] }>;
  }

  // ── Project registration ──────────────────────────────────────────────────

  /**
   * Register or update a project on SciStarter.
   * Projects are reviewed editorially before being published (usually < 24 hours).
   * Include scistarter_id to update an existing project.
   */
  async registerProject(project: {
    name: string;
    guid: string;
    description: string;
    url: string;
    origin: string;
    contact_email: string;
    contact_name?: string;
    goal?: string;
    task?: string;
    image?: string;
    status?: "starting" | "active" | "hiatus" | "complete" | "hidden";
    audience?: string[];
    outdoors?: boolean;
    regions?: string;
    scistarter_id?: number;
    [key: string]: unknown;
  }): Promise<{ scistarter_id: number; result: string }> {
    const res = await fetch(`${BASE}/api/project/add`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...project, key: this.apiKey }),
    });
    if (!res.ok) throw new Error(`SciStarter project registration failed: ${res.status}`);
    return res.json() as Promise<{ scistarter_id: number; result: string }>;
  }
}

// ── ARtWalk convenience wrapper ───────────────────────────────────────────────

/**
 * High-level helper used by the submit-observation Edge Function.
 * Handles the full flow: hash email → check if known → record event.
 * Non-blocking by design — call without await in the Edge Function.
 */
export async function creditSciStarterParticipation(params: {
  client: SciStarterClient;
  projectSlug: string;
  sciStarterProjectId: number;
  walkerEmail: string;
  participationType: ParticipationType;
  durationSeconds: number;
  lat: number;
  lng: number;
}): Promise<void> {
  const hashed = await hashEmail(params.walkerEmail);

  // Check if this walker is a known SciStarter member
  const profile = await params.client.getProfileByHash(hashed);
  if (!profile.known) return; // Silently skip — no SciStarter account

  // Record via the detailed record_event endpoint for richer analytics
  await params.client.recordEvent({
    profileId:  profile.scistarter_profile_id,
    projectId:  params.sciStarterProjectId,
    type:       params.participationType,
    duration:   params.durationSeconds,
    where: {
      type:        "Point",
      coordinates: [params.lng, params.lat],
    },
    when: new Date().toISOString().replace("Z", "").split(".")[0],
  });
}
