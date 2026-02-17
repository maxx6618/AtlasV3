/**
 * Serper.dev Google Search integration (via serverless proxy).
 * Returns structured search results with titles, URLs, and descriptions.
 */

interface SerperResult {
  title: string;
  url: string;
  description: string;
  [key: string]: any;
}

export const serperGoogleSearch = async (
  query: string,
  _apiKey?: string,
  maxResults: number = 10
): Promise<{ results: SerperResult[]; error?: string }> => {
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
    return { results: data.results || [] };
  } catch (error: any) {
    console.error('Serper search error:', error);
    return { results: [], error: error.message || 'Serper search failed' };
  }
};
