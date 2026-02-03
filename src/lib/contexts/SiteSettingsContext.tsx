'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SiteSettings } from '@/types';

interface SiteSettingsMap {
  site_name: string;
  site_description: string;
  site_logo: string | null;
  site_favicon: string | null;
  primary_color: string;
  welcome_message: string;
}

interface SiteSettingsContextType {
  settings: SiteSettingsMap;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: SiteSettingsMap = {
  site_name: 'Agara Köyü',
  site_description: 'Agara Köyü Sosyal Ağı',
  site_logo: null,
  site_favicon: null,
  primary_color: '#10b981',
  welcome_message: 'Agara Köyü sosyal ağına hoş geldiniz!',
};

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettingsMap>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value');

    if (data) {
      const settingsMap = { ...defaultSettings };
      data.forEach((item: { key: string; value: string | null }) => {
        if (item.key in settingsMap) {
          (settingsMap as Record<string, string | null>)[item.key] = item.value;
        }
      });
      setSettings(settingsMap as SiteSettingsMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
