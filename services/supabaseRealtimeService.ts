import { supabase } from './supabaseClient';
import { VerticalData, SheetTab, RowData } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { loadVerticals } from './supabaseDataService';

export type VerticalUpdateCallback = (verticals: VerticalData[]) => void;
export type SheetUpdateCallback = (sheet: SheetTab) => void;
export type RowUpdateCallback = (rows: RowData[], sheetId: string) => void;

class RealtimeService {
  private verticalChannel: RealtimeChannel | null = null;
  private sheetChannels: Map<string, RealtimeChannel> = new Map();
  private rowChannels: Map<string, RealtimeChannel> = new Map();

  // ── Vertical Subscriptions ─────────────────────────────────────────

  subscribeToVerticals(callback: VerticalUpdateCallback): () => void {
    // Unsubscribe from existing channel if any
    if (this.verticalChannel) {
      supabase.removeChannel(this.verticalChannel);
    }

    this.verticalChannel = supabase
      .channel('verticals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verticals',
        },
        async () => {
          // Reload all verticals when any vertical changes
          try {
            const verticals = await loadVerticals();
            callback(verticals);
          } catch (error) {
            console.error('Error reloading verticals:', error);
          }
        }
      )
      .subscribe();

    return () => {
      if (this.verticalChannel) {
        supabase.removeChannel(this.verticalChannel);
        this.verticalChannel = null;
      }
    };
  }

  // ── Sheet Subscriptions ────────────────────────────────────────────

  subscribeToSheets(verticalId: string, callback: SheetUpdateCallback): () => void {
    // Unsubscribe from existing channel for this vertical if any
    const existingChannel = this.sheetChannels.get(verticalId);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(`sheets-changes-${verticalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sheets',
          filter: `vertical_id=eq.${verticalId}`,
        },
        async (payload) => {
          try {
            const verticals = await loadVerticals();
            const vertical = verticals.find(v => v.id === verticalId);
            if (vertical) {
              const sheet = vertical.sheets.find(s => s.id === payload.new?.id || payload.old?.id);
              if (sheet) {
                callback(sheet);
              }
            }
          } catch (error) {
            console.error('Error reloading sheet:', error);
          }
        }
      )
      .subscribe();

    this.sheetChannels.set(verticalId, channel);

    return () => {
      const channelToRemove = this.sheetChannels.get(verticalId);
      if (channelToRemove) {
        supabase.removeChannel(channelToRemove);
        this.sheetChannels.delete(verticalId);
      }
    };
  }

  // ── Row Subscriptions ──────────────────────────────────────────────

  subscribeToRows(sheetId: string, callback: RowUpdateCallback): () => void {
    // Unsubscribe from existing channel for this sheet if any
    const existingChannel = this.rowChannels.get(sheetId);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(`rows-changes-${sheetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rows',
          filter: `sheet_id=eq.${sheetId}`,
        },
        async () => {
          try {
            // Reload all rows for this sheet
            const { data: rowsData, error } = await supabase
              .from('rows')
              .select('*')
              .eq('sheet_id', sheetId)
              .order('created_at', { ascending: true });

            if (error) throw error;

            const rows: RowData[] = rowsData?.map(r => r.data) || [];
            callback(rows, sheetId);
          } catch (error) {
            console.error('Error reloading rows:', error);
          }
        }
      )
      .subscribe();

    this.rowChannels.set(sheetId, channel);

    return () => {
      const channelToRemove = this.rowChannels.get(sheetId);
      if (channelToRemove) {
        supabase.removeChannel(channelToRemove);
        this.rowChannels.delete(sheetId);
      }
    };
  }

  // ── Cleanup ────────────────────────────────────────────────────────

  unsubscribeAll(): void {
    if (this.verticalChannel) {
      supabase.removeChannel(this.verticalChannel);
      this.verticalChannel = null;
    }

    this.sheetChannels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.sheetChannels.clear();

    this.rowChannels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.rowChannels.clear();
  }
}

export const realtimeService = new RealtimeService();
