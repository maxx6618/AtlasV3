import { createClient } from '@supabase/supabase-js';

export interface AppSettingsFromDB {
  googleApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  serperApiKey?: string;
  apifyApiKey?: string;
  elevenLabsApiKey?: string;
  [key: string]: unknown;
}

const APP_SETTINGS_ID = 'global';

/**
 * Load app_settings from Supabase (server-side only).
 * Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env.
 * Returns null if not configured or fetch fails.
 */
export async function loadAppSettingsFromSupabase(): Promise<AppSettingsFromDB | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  try {
    const supabase = createClient(url, serviceKey);
    const { data, error } = await supabase
      .from('app_settings')
      .select('settings')
      .eq('id', APP_SETTINGS_ID)
      .maybeSingle();

    if (error || !data) return null;

    const settings = (data as { settings?: AppSettingsFromDB }).settings;
    return settings && typeof settings === 'object' ? settings : null;
  } catch {
    return null;
  }
}

/**
 * Get API key with fallback: Supabase settings first, then env.
 */
export function resolveKey(
  settings: AppSettingsFromDB | null,
  settingsKey: keyof AppSettingsFromDB,
  envKey: string
): string {
  const fromSettings = settings?.[settingsKey];
  if (typeof fromSettings === 'string' && fromSettings.trim()) return fromSettings.trim();
  const fromEnv = process.env[envKey];
  return typeof fromEnv === 'string' ? fromEnv : '';
}
