import { createClient } from '@supabase/supabase-js';
import { ColumnDefinition, AgentConfig, HttpRequestConfig, RowData, AppSettings } from '../types';

// Supabase types for database tables
export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string;
          settings: AppSettings;
          created_at?: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          settings: AppSettings;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          settings?: AppSettings;
          updated_at?: string;
        };
      };
      verticals: {
        Row: {
          id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          updated_at?: string;
        };
      };
      sheets: {
        Row: {
          id: string;
          vertical_id: string;
          name: string;
          description: string | null;
          color: string;
          columns: ColumnDefinition[];
          agents: AgentConfig[];
          http_requests: HttpRequestConfig[];
          auto_update: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          name: string;
          description?: string | null;
          color: string;
          columns: ColumnDefinition[];
          agents?: AgentConfig[];
          http_requests?: HttpRequestConfig[];
          auto_update?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          columns?: ColumnDefinition[];
          agents?: AgentConfig[];
          http_requests?: HttpRequestConfig[];
          auto_update?: boolean;
          updated_at?: string;
        };
      };
      rows: {
        Row: {
          id: string;
          sheet_id: string;
          data: RowData;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          data: RowData;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sheet_id?: string;
          data?: RowData;
          updated_at?: string;
        };
      };
    };
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Support both new publishable key (sb_publishable_...) and legacy anon key
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY for legacy) in your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // We're not using auth yet
    autoRefreshToken: false,
  },
});
