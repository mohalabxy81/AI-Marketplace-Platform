"use client";

import { useEffect } from "react";
import { useCompanyTheme } from "../hooks/use-company-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useCompanyTheme();

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;
    const { theme_config } = settings;

    // Apply colors
    if (theme_config.colors) {
      if (theme_config.colors.primary) root.style.setProperty("--color-primary", theme_config.colors.primary);
      if (theme_config.colors.background) root.style.setProperty("--color-bg", theme_config.colors.background);
      if (theme_config.colors.accent) root.style.setProperty("--color-accent", theme_config.colors.accent);
      if (theme_config.colors.text) root.style.setProperty("--color-text", theme_config.colors.text);
      if (theme_config.colors.border) root.style.setProperty("--color-border", theme_config.colors.border);
    }

    // Apply typography
    if (theme_config.typography) {
      if (theme_config.typography.font_family) root.style.setProperty("--font-sans", theme_config.typography.font_family);
      if (theme_config.typography.headings) root.style.setProperty("--font-heading", theme_config.typography.headings);
    }

    // Apply radius
    if (theme_config.radius) {
      root.style.setProperty("--radius", theme_config.radius);
    }

  }, [settings]);

  return <>{children}</>;
}
