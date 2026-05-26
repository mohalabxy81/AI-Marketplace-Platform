import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth.store';

export interface ThemeConfig {
  colors: {
    primary: string;
    background: string;
    accent: string;
    text: string;
    border: string;
  };
  typography: {
    font_family: string;
    headings: string;
  };
  radius: string;
}

export interface LayoutConfig {
  sidebar_style: 'default' | 'collapsed' | 'transparent';
  layout_density: 'comfortable' | 'compact' | 'spacious';
}

export interface CompanyUISettings {
  id: string;
  company_id: string;
  logo_url: string | null;
  theme_config: ThemeConfig;
  layout_config: LayoutConfig;
}

export function useCompanyTheme() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<CompanyUISettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.company_id) {
      const timer = setTimeout(() => setIsLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const supabase = getSupabaseBrowserClient();

    const fetchTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('company_ui_settings')
          .select('*')
          .eq('company_id', user.company_id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
          throw error;
        }

        if (data) {
          setSettings(data as CompanyUISettings);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch theme settings'));
        console.error('Error fetching theme settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTheme();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:company_ui_settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_ui_settings',
          filter: `company_id=eq.${user.company_id}`,
        },
        (payload: { new: CompanyUISettings | null }) => {
          if (payload.new) {
            setSettings(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.company_id]);

  return { settings, isLoading, error };
}
