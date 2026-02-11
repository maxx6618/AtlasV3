import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnType, AgentProvider } from '../types';
import { runJSONTask } from './geminiService';
import { runOpenAIAgent } from './openaiService';
import { runAnthropicAgent } from './anthropicService';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string | number | null>[];
  sheets?: ParsedSheet[];
  fileName?: string;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string | number | null>[];
}

export interface HeaderMatch {
  sourceHeader: string;
  targetHeader: string | null;
  confidence: number;
  reason?: string;
}

export interface HeaderMatchConfig {
  provider: AgentProvider;
  modelId: string;
  confidenceThreshold: number;
  useFuzzyMatching: boolean;
  apiKey?: string;
  apiKeys?: {
    google?: string;
    anthropic?: string;
    openai?: string;
  };
}

export const normalizeHeader = (header: string) =>
  header
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const createColumnId = (header: string) => {
  const normalized = normalizeHeader(header)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized ? normalized : `field_${Date.now()}`;
};

export const inferColumnType = (values: Array<string | number | null>) => {
  let numberCount = 0;
  let total = 0;
  values.forEach(value => {
    if (value === null || value === undefined || value === '') return;
    total += 1;
    const asNumber = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
      numberCount += 1;
    }
  });
  if (total > 0 && numberCount / total >= 0.8) {
    return ColumnType.NUMBER;
  }
  return ColumnType.TEXT;
};

export const coerceCellValue = (value: string | number | null, type: ColumnType) => {
  if (value === null || value === undefined) {
    return type === ColumnType.NUMBER ? 0 : '';
  }
  if (type === ColumnType.NUMBER) {
    const asNumber = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }
  return value.toString();
};

const dedupeHeaders = (headers: string[]) => {
  const seen = new Map<string, number>();
  return headers.map(header => {
    const trimmed = header.trim();
    const key = normalizeHeader(trimmed);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return trimmed;
    return `${trimmed} (${count})`;
  });
};

export const parseCsvFile = async (file: File): Promise<ParsedFile> => {
  const text = await file.text();
  const result = Papa.parse<Record<string, string | number | null>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rawHeaders = result.meta.fields || [];
  const headers = dedupeHeaders(rawHeaders.filter(Boolean));
  const rows = result.data.map(row => {
    const normalizedRow: Record<string, string | number | null> = {};
    headers.forEach(header => {
      const rawValue = row[header];
      normalizedRow[header] = rawValue === undefined ? null : rawValue;
    });
    return normalizedRow;
  });

  return { headers, rows };
};

const parseSheet = (sheet: XLSX.WorkSheet, name: string): ParsedSheet => {
  const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
  if (!rawRows.length) {
    return { name, headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = rawRows;
  const headers = dedupeHeaders(
    (headerRow || []).map((cell: any) => (cell ?? '').toString().trim()).filter(Boolean)
  );

  const rows = dataRows.map((row: any[]) => {
    const normalizedRow: Record<string, string | number | null> = {};
    headers.forEach((header, index) => {
      const value = row?.[index];
      normalizedRow[header] = value === undefined ? null : value;
    });
    return normalizedRow;
  }).filter(row => Object.values(row).some(value => value !== null && value !== ''));

  return { name, headers, rows };
};

export const parseExcelFile = async (file: File): Promise<ParsedFile> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) return { headers: [], rows: [], sheets: [] };
  const sheets = sheetNames.map(name => parseSheet(workbook.Sheets[name], name));
  const first = sheets[0] || { name: '', headers: [], rows: [] };
  return { headers: first.headers, rows: first.rows, sheets };
};

export const parseFile = async (file: File): Promise<ParsedFile> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCsvFile(file);
  if (ext === 'xls' || ext === 'xlsx') return parseExcelFile(file);
  return { headers: [], rows: [] };
};

const scoreMatch = (source: string, target: string) => {
  const a = normalizeHeader(source);
  const b = normalizeHeader(target);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.7;
  return 0;
};

export const simpleHeaderMatch = (sourceHeaders: string[], targetHeaders: string[]): HeaderMatch[] => {
  return sourceHeaders.map(source => {
    let best: { header: string | null; score: number } = { header: null, score: 0 };
    targetHeaders.forEach(target => {
      const score = scoreMatch(source, target);
      if (score > best.score) {
        best = { header: target, score };
      }
    });
    return {
      sourceHeader: source,
      targetHeader: best.score >= 0.5 ? best.header : null,
      confidence: best.score,
      reason: best.score >= 0.5 ? 'Normalized match' : 'No confident match'
    };
  });
};

export const matchHeadersWithLLM = async (
  sourceHeaders: string[],
  targetHeaders: string[],
  config: HeaderMatchConfig
): Promise<HeaderMatch[]> => {
  const fallbackKeys = config.apiKeys || {};
  const mergedKeys = {
    google: config.provider === AgentProvider.GOOGLE ? config.apiKey : fallbackKeys.google,
    anthropic: config.provider === AgentProvider.ANTHROPIC ? config.apiKey : fallbackKeys.anthropic,
    openai: config.provider === AgentProvider.OPENAI ? config.apiKey : fallbackKeys.openai
  };

  if ((!mergedKeys.google && !mergedKeys.anthropic && !mergedKeys.openai) || targetHeaders.length === 0 || !config.useFuzzyMatching) {
    return simpleHeaderMatch(sourceHeaders, targetHeaders);
  }

  const prompt = [
    `Match uploaded headers to existing headers.`,
    `Return JSON with key "matches" as an array of objects:`,
    `{ "sourceHeader": string, "targetHeader": string | null, "confidence": number, "reason": string }`,
    `Only choose a targetHeader from the provided existing list.`,
    `If there is no confident match, return null for targetHeader.`,
    ``,
    `Uploaded headers: ${JSON.stringify(sourceHeaders)}`,
    `Existing headers: ${JSON.stringify(targetHeaders)}`
  ].join('\n');

  try {
    const systemInstruction = 'You are a data mapping assistant. Return a single valid JSON object only.';
    const providerOrder = [
      {
        provider: AgentProvider.GOOGLE,
        apiKey: mergedKeys.google,
        modelId: config.modelId || 'gemini-2.5-flash-lite'
      },
      {
        provider: AgentProvider.ANTHROPIC,
        apiKey: mergedKeys.anthropic,
        modelId: 'claude-haiku-4-5'
      },
      {
        provider: AgentProvider.OPENAI,
        apiKey: mergedKeys.openai,
        modelId: 'gpt-4o-mini'
      }
    ];

    let lastError: Error | null = null;
    for (const candidate of providerOrder) {
      if (!candidate.apiKey) continue;
      try {
        let raw = '';
        switch (candidate.provider) {
          case AgentProvider.OPENAI:
            raw = await runOpenAIAgent(candidate.modelId, prompt, candidate.apiKey, systemInstruction);
            break;
          case AgentProvider.ANTHROPIC:
            raw = await runAnthropicAgent(candidate.modelId, prompt, candidate.apiKey, systemInstruction);
            break;
          default:
            raw = await runJSONTask(candidate.modelId, prompt, systemInstruction, candidate.apiKey);
            break;
        }

        const cleaned = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed?.error) {
          throw new Error(parsed.error);
        }
        const matches = Array.isArray(parsed?.matches) ? parsed.matches : [];
        if (matches.length === 0) return simpleHeaderMatch(sourceHeaders, targetHeaders);
        return matches.map((match: any) => ({
          sourceHeader: match.sourceHeader,
          targetHeader: match.targetHeader ?? null,
          confidence: typeof match.confidence === 'number' ? match.confidence : 0,
          reason: match.reason
        }));
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (lastError) {
      console.error('Header match LLM failed:', lastError);
    }
    return simpleHeaderMatch(sourceHeaders, targetHeaders);
  } catch (error) {
    console.error('Header match LLM failed:', error);
    return simpleHeaderMatch(sourceHeaders, targetHeaders);
  }
};
