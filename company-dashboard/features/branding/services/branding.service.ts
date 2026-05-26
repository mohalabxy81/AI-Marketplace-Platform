import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeConfig, LayoutConfig, CompanyUISettings } from "../hooks/use-company-theme";

export async function getCompanyUISettings(companyId: string): Promise<CompanyUISettings | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("company_ui_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found is fine, we'll use defaults
      return null;
    }
    console.error("Error fetching UI settings:", error);
    throw error;
  }

  return data as CompanyUISettings;
}

export async function updateCompanyUISettings(
  companyId: string,
  settings: { theme_config?: ThemeConfig; layout_config?: LayoutConfig; custom_css?: string }
): Promise<CompanyUISettings> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("company_ui_settings")
    .upsert({
      company_id: companyId,
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating UI settings:", error);
    throw error;
  }

  return data as CompanyUISettings;
}

export async function uploadBrandingAsset(
  companyId: string,
  file: File,
  assetType: "logo" | "favicon" | "hero"
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  
  // Use a predictable path: companyId/assetType.extension
  const fileExt = file.name.split('.').pop();
  const fileName = `${assetType}.${fileExt}`;
  const filePath = `${companyId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("branding_assets")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Error uploading asset:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("branding_assets")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
