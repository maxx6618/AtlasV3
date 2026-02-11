import { supabase } from './supabaseClient';
import { VerticalData, SheetTab, RowData } from '../types';

// ── Vertical Operations ──────────────────────────────────────────────

export const loadVerticals = async (): Promise<VerticalData[]> => {
  try {
    // Load all verticals
    const { data: verticalsData, error: verticalsError } = await supabase
      .from('verticals')
      .select('*')
      .order('created_at', { ascending: true });

    if (verticalsError) throw verticalsError;
    if (!verticalsData || verticalsData.length === 0) {
      return []; // Return empty array if no data
    }

    // Load all sheets for these verticals
    const verticalIds = verticalsData.map(v => v.id);
    const { data: sheetsData, error: sheetsError } = await supabase
      .from('sheets')
      .select('*')
      .in('vertical_id', verticalIds)
      .order('created_at', { ascending: true });

    if (sheetsError) throw sheetsError;

    // Load all rows for these sheets
    const sheetIds = sheetsData?.map(s => s.id) || [];
    let rowsData: any[] = [];
    if (sheetIds.length > 0) {
      const { data: rows, error: rowsError } = await supabase
        .from('rows')
        .select('*')
        .in('sheet_id', sheetIds)
        .order('created_at', { ascending: true });

      if (rowsError) throw rowsError;
      rowsData = rows || [];
    }

    // Group rows by sheet_id
    const rowsBySheetId = new Map<string, RowData[]>();
    rowsData.forEach(row => {
      const sheetRows = rowsBySheetId.get(row.sheet_id) || [];
      sheetRows.push(row.data);
      rowsBySheetId.set(row.sheet_id, sheetRows);
    });

    // Group sheets by vertical_id
    const sheetsByVerticalId = new Map<string, SheetTab[]>();
    sheetsData?.forEach(sheet => {
      const verticalSheets = sheetsByVerticalId.get(sheet.vertical_id) || [];
      verticalSheets.push({
        id: sheet.id,
        name: sheet.name,
        description: sheet.description || undefined,
        color: sheet.color,
        columns: sheet.columns,
        rows: rowsBySheetId.get(sheet.id) || [],
        agents: sheet.agents || [],
        httpRequests: sheet.http_requests || [],
        autoUpdate: sheet.auto_update || false,
      });
      sheetsByVerticalId.set(sheet.vertical_id, verticalSheets);
    });

    // Build VerticalData array
    const verticals: VerticalData[] = verticalsData.map(vertical => ({
      id: vertical.id,
      name: vertical.name,
      color: vertical.color,
      sheets: sheetsByVerticalId.get(vertical.id) || [],
    }));

    return verticals;
  } catch (error) {
    console.error('Error loading verticals:', error);
    throw error;
  }
};

export const saveVertical = async (vertical: VerticalData): Promise<void> => {
  try {
    const { error } = await supabase
      .from('verticals')
      .upsert({
        id: vertical.id,
        name: vertical.name,
        color: vertical.color,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;

    // Save all sheets for this vertical
    for (const sheet of vertical.sheets) {
      await saveSheet(sheet, vertical.id);
    }
  } catch (error) {
    console.error('Error saving vertical:', error);
    throw error;
  }
};

export const deleteVertical = async (id: string): Promise<void> => {
  try {
    // Get all sheets for this vertical
    const { data: sheets } = await supabase
      .from('sheets')
      .select('id')
      .eq('vertical_id', id);

    if (sheets && sheets.length > 0) {
      const sheetIds = sheets.map(s => s.id);
      
      // Delete all rows for these sheets
      await supabase
        .from('rows')
        .delete()
        .in('sheet_id', sheetIds);

      // Delete all sheets
      await supabase
        .from('sheets')
        .delete()
        .eq('vertical_id', id);
    }

    // Delete the vertical
    const { error } = await supabase
      .from('verticals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting vertical:', error);
    throw error;
  }
};

// ── Sheet Operations ─────────────────────────────────────────────────

export const saveSheet = async (sheet: SheetTab, verticalId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('sheets')
      .upsert({
        id: sheet.id,
        vertical_id: verticalId,
        name: sheet.name,
        description: sheet.description || null,
        color: sheet.color,
        columns: sheet.columns,
        agents: sheet.agents || [],
        http_requests: sheet.httpRequests || [],
        auto_update: sheet.autoUpdate || false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;

    // Save all rows for this sheet
    for (const row of sheet.rows) {
      await saveRow(row, sheet.id);
    }
  } catch (error) {
    console.error('Error saving sheet:', error);
    throw error;
  }
};

export const deleteSheet = async (id: string): Promise<void> => {
  try {
    // Delete all rows for this sheet
    await supabase
      .from('rows')
      .delete()
      .eq('sheet_id', id);

    // Delete the sheet
    const { error } = await supabase
      .from('sheets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting sheet:', error);
    throw error;
  }
};

// ── Row Operations ──────────────────────────────────────────────────

export const saveRow = async (row: RowData, sheetId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('rows')
      .upsert({
        id: row.id,
        sheet_id: sheetId,
        data: row,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving row:', error);
    throw error;
  }
};

export const deleteRow = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('rows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting row:', error);
    throw error;
  }
};

// ── Batch Operations ─────────────────────────────────────────────────

export const saveAllVerticals = async (verticals: VerticalData[]): Promise<void> => {
  try {
    // Save all verticals in parallel (but sheets/rows sequentially per vertical)
    await Promise.all(verticals.map(vertical => saveVertical(vertical)));
  } catch (error) {
    console.error('Error saving all verticals:', error);
    throw error;
  }
};
