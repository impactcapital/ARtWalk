/**
 * Supabase type stubs — generate the real version with:
 *   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */
export type Database = {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string;
          artist_id: string;
          district_id: string | null;
          title: string;
          description: string | null;
          activation_radius_m: number;
          facing_bearing: number | null;
          asset_url: string;
          thumbnail_url: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["artworks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["artworks"]["Insert"]>;
      };
      walker_profiles: {
        Row: {
          user_id: string;
          display_name: string;
          points: number;
          level: number;
          visit_streak_days: number;
          last_visit_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["walker_profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["walker_profiles"]["Insert"]>;
      };
    };
    Functions: {
      artworks_near: {
        Args: { user_lat: number; user_lng: number; radius_m: number };
        Returns: Array<{
          id: string;
          title: string;
          asset_url: string;
          thumbnail_url: string | null;
          activation_radius_m: number;
          facing_bearing: number | null;
          distance_m: number;
          lat: number;
          lng: number;
        }>;
      };
      process_artwork_visit: {
        Args: { p_user_id: string; p_artwork_id: string; p_lat: number; p_lng: number };
        Returns: {
          points_awarded: number;
          is_first_visit: boolean;
          new_achievements: unknown[];
          collectible_awarded: unknown | null;
        };
      };
    };
  };
};
