import { supabase } from './supabaseClient';
import { AppSettings } from '../types';

const APP_SETTINGS_ID = 'global';

export const loadAppSettings = async (): Promise<AppSettings | null> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('settings')
    .eq('id', APP_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.settings as AppSettings) ?? null;
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      {
        id: APP_SETTINGS_ID,
        settings,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw error;
  }
};
