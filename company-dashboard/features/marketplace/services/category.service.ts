import { createServerClient } from "@supabase/ssr";
import { TenantContext } from "@/types/contracts/tenant.context";

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  attributes_schema: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
}

export class CategoryService {
  /**
   * Retrieves the full category hierarchy for a tenant.
   * Caches results if possible.
   */
  public async getHierarchy(_context: TenantContext): Promise<DbCategory[]> {
    const supabase = this.getClient();
    
    // In a real implementation, categories might be global or tenant-scoped.
    // Assuming global but active filter for now.
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[CategoryService] Failed to fetch hierarchy", error);
      return [];
    }

    return data as DbCategory[];
  }

  /**
   * Validates dynamic JSONB attributes against the category's schema.
   */
  public async validateAttributes(categoryId: string, attributes: Record<string, unknown>): Promise<boolean> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from("categories")
      .select("attributes_schema")
      .eq("id", categoryId)
      .single();

    if (!data?.attributes_schema) return true; // No strict schema defined

    // Schema validation logic goes here (e.g. using AJV or Zod if schema format is known)
    // For now, we perform a basic key presence check
    const schemaKeys = Object.keys(data.attributes_schema);
    for (const key of schemaKeys) {
      if ((data.attributes_schema as Record<string, unknown>)[key] && (data.attributes_schema as Record<string, { required?: boolean }>)[key].required && attributes[key] === undefined) {
        return false;
      }
    }
    return true;
  }

  private getClient() {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );
  }
}

export const categoryService = new CategoryService();
