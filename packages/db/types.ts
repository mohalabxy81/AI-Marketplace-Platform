/**
 * Database Types — @marketplace/db
 *
 * Auto-generated Supabase type definitions.
 * Regenerate with: pnpm supabase gen types typescript --project-id <id> > packages/db/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Core tables
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          role: 'super_admin' | 'tenant_owner' | 'tenant_admin' | 'tenant_member' | 'public';
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'super_admin' | 'tenant_owner' | 'tenant_admin' | 'tenant_member' | 'public';
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'super_admin' | 'tenant_owner' | 'tenant_admin' | 'tenant_member' | 'public';
          organization_id?: string | null;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          brand_color: string | null;
          plan_tier: 'free' | 'pro' | 'enterprise';
          status: 'active' | 'suspended' | 'cancelled';
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          brand_color?: string | null;
          plan_tier?: 'free' | 'pro' | 'enterprise';
          status?: 'active' | 'suspended' | 'cancelled';
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          logo_url?: string | null;
          brand_color?: string | null;
          plan_tier?: 'free' | 'pro' | 'enterprise';
          status?: 'active' | 'suspended' | 'cancelled';
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          title: string;
          description: string | null;
          status: 'draft' | 'active' | 'archived' | 'quarantined';
          price: number | null;
          currency: string;
          attributes: Json | null;
          quality_score: number | null;
          trust_score: number | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'archived' | 'quarantined';
          price?: number | null;
          currency?: string;
          attributes?: Json | null;
          quality_score?: number | null;
          trust_score?: number | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'archived' | 'quarantined';
          price?: number | null;
          currency?: string;
          attributes?: Json | null;
          quality_score?: number | null;
          trust_score?: number | null;
          published_at?: string | null;
          updated_at?: string;
        };
      };
      // Add more tables as migrations are applied
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'super_admin' | 'tenant_owner' | 'tenant_admin' | 'tenant_member' | 'public';
      plan_tier: 'free' | 'pro' | 'enterprise';
      listing_status: 'draft' | 'active' | 'archived' | 'quarantined';
      org_status: 'active' | 'suspended' | 'cancelled';
    };
  };
}
