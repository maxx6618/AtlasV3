/**
 * Serper.dev Google Search integration (via serverless proxy).
 * Returns structured search results with titles, URLs, descriptions,
 * and knowledgeGraph for parent company resolution.
 */

export interface SerperResult {
  title: string;
  url: string;
  description: string;
  [key: string]: any;
}

export interface SerperKnowledgeGraph {
  title: string;
  type: string;
  description: string;
}

export interface SerperResponse {
  results: SerperResult[];
  knowledgeGraph: SerperKnowledgeGraph | null;
  error?: string;
}

export const serperGoogleSearch = async (
  query: string,
  _apiKey?: string,
  maxResults: number = 10
): Promise<SerperResponse> => {
  try {
    const response = await fetch('/api/serper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      results: data.results || [],
      knowledgeGraph: data.knowledgeGraph || null,
    };
  } catch (error: any) {
    console.error('Serper search error:', error);
    return { results: [], knowledgeGraph: null, error: error.message || 'Serper search failed' };
  }
};

// ── NorthData URL parsing ─────────────────────────────

/**
 * Extract company name from a NorthData URL.
 * Pattern: northdata.de/Company%20Name,City/HRB%20XXXXX
 */
export const extractCompanyFromNorthData = (url: string): string | null => {
  const match = url.match(/northdata\.de\/([^/]+)/);
  if (!match) return null;
  const raw = decodeURIComponent(match[1]);
  const parts = raw.split(',');
  return parts[0]?.trim() || null;
};

/**
 * Extract HRB/HRA register number from text.
 */
export const extractHRB = (text: string): string | null => {
  const match = text.match(/(HRB|HRA)\s*(\d+)/);
  return match ? `${match[1]} ${match[2]}` : null;
};

// ── Umlaut expansion for German brand names ───────────

const UMLAUT_MAP: Record<string, string> = { ue: 'ü', ae: 'ä', oe: 'ö' };

export const expandUmlauts = (text: string): string => {
  let result = text;
  for (const [ascii, umlaut] of Object.entries(UMLAUT_MAP)) {
    result = result.replace(new RegExp(ascii, 'g'), umlaut);
  }
  return result;
};
