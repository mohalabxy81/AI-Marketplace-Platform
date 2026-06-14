"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { updateCompanyUISettings, uploadBrandingAsset } from "../services/branding.service";
import { useCompanyTheme } from "../hooks/use-company-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

type FormValues = {
  colorPrimary: string;
  colorAccent: string;
  colorSurface: string;
  colorText: string;
  radius: string;
  sidebarStyle: string;
  density: string;
};

export function ThemeControls() {
  const { company } = useAuth();
  const { settings, isLoading } = useCompanyTheme();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const themeConfig = settings?.theme_config;
  const layoutConfig = settings?.layout_config;

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      colorPrimary: themeConfig?.colors.primary || "#000000",
      colorAccent: themeConfig?.colors.accent || "#000000",
      colorSurface: themeConfig?.colors.background || "#ffffff",
      colorText: themeConfig?.colors.text || "#000000",
      radius: themeConfig?.radius || "0.5rem",
      sidebarStyle: layoutConfig?.sidebar_style || "default",
      density: layoutConfig?.layout_density || "comfortable",
    },
  });

  // Keep form in sync if external changes happen
  React.useEffect(() => {
    if (themeConfig) {
      setValue("colorPrimary", themeConfig.colors.primary);
      setValue("colorAccent", themeConfig.colors.accent);
      setValue("colorSurface", themeConfig.colors.background);
      setValue("colorText", themeConfig.colors.text);
      setValue("radius", themeConfig.radius);
    }
  }, [themeConfig, setValue]);

  React.useEffect(() => {
    if (layoutConfig) {
      setValue("sidebarStyle", layoutConfig.sidebar_style);
      setValue("density", layoutConfig.layout_density);
    }
  }, [layoutConfig, setValue]);

  const onSubmit = async (data: FormValues) => {
    if (!company?.id) return;
    
    setIsSaving(true);
    try {
      await updateCompanyUISettings(company.id, {
        theme_config: {
          colors: {
            primary: data.colorPrimary,
            accent: data.colorAccent,
            background: data.colorSurface,
            text: data.colorText,
            border: themeConfig?.colors.border || "#e5e7eb",
          },
          typography: {
            font_family: themeConfig?.typography.font_family || "Inter",
            headings: themeConfig?.typography.headings || "Inter",
          },
          radius: data.radius,
        },
        layout_config: {
          sidebar_style: data.sidebarStyle as "default" | "collapsed" | "transparent",
          layout_density: data.density as "compact" | "comfortable" | "spacious",
        }
      });
      alert("Branding updated successfully");
    } catch (e) {
      console.error(e);
      alert("Failed to update branding settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    setIsUploading(true);
    try {
      await uploadBrandingAsset(company.id, file, "logo");
      alert("Logo uploaded successfully");
    } catch (e) {
      console.error(e);
      alert("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <div>Loading settings...</div>;

  // eslint-disable-next-line react-hooks/incompatible-library
  const currentRadius = watch("radius");
  const currentSidebarStyle = watch("sidebarStyle");
  const currentDensity = watch("density");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-xl">
      {/* Brand Assets */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium leading-none mb-1">Brand Assets</h3>
          <p className="text-sm text-muted-foreground">Upload your company logo and icon.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-muted overflow-hidden shrink-0">
             {company?.logo ? (
                <Image src={company.logo} alt="Logo" width={64} height={64} className="w-full h-full object-cover" />
             ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
             )}
          </div>
          <div className="flex-1">
            <label htmlFor="logo-upload" className="cursor-pointer flex items-center justify-center w-full max-w-xs px-4 py-2 border border-dashed rounded-md hover:bg-muted/50 transition-colors">
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">Upload new logo</span>
            </label>
            <input 
              id="logo-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleLogoUpload}
              disabled={isUploading}
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Colors */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium leading-none mb-1">Colors</h3>
          <p className="text-sm text-muted-foreground">Customize your brand colors. These changes apply globally.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Primary Color</label>
            <div className="flex gap-2">
              <Input type="color" className="w-12 p-1 h-9 cursor-pointer" {...register("colorPrimary")} />
              <Input type="text" className="font-mono text-xs uppercase" {...register("colorPrimary")} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Accent Color</label>
            <div className="flex gap-2">
              <Input type="color" className="w-12 p-1 h-9 cursor-pointer" {...register("colorAccent")} />
              <Input type="text" className="font-mono text-xs uppercase" {...register("colorAccent")} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Surface (Background)</label>
            <div className="flex gap-2">
              <Input type="color" className="w-12 p-1 h-9 cursor-pointer" {...register("colorSurface")} />
              <Input type="text" className="font-mono text-xs uppercase" {...register("colorSurface")} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Text Color</label>
            <div className="flex gap-2">
              <Input type="color" className="w-12 p-1 h-9 cursor-pointer" {...register("colorText")} />
              <Input type="text" className="font-mono text-xs uppercase" {...register("colorText")} />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Interface Layout */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium leading-none mb-1">Interface</h3>
          <p className="text-sm text-muted-foreground">Adjust the structural look of your dashboard.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium leading-none">Border Radius</label>
            <select 
              value={currentRadius} 
              onChange={(e) => setValue("radius", e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="0px">Sharp (0px)</option>
              <option value="0.25rem">Subtle (0.25rem)</option>
              <option value="0.5rem">Medium (0.5rem)</option>
              <option value="1rem">Rounded (1rem)</option>
            </select>
          </div>

          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium leading-none">Sidebar Style</label>
            <select 
              value={currentSidebarStyle} 
              onChange={(e) => setValue("sidebarStyle", e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="default">Default</option>
              <option value="collapsed">Collapsed</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>

          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium leading-none">Density</label>
            <select 
              value={currentDensity} 
              onChange={(e) => setValue("density", e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving changes...
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}
