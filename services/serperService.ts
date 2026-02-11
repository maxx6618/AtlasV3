/**
 * Serper.dev Google Search integration.
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
  apiKey: string,
  maxResults: number = 10
): Promise<{ results: SerperResult[]; error?: string }> => {
  if (!apiKey) {
    return { results: [], error: 'Serper API key is missing. Add it in Settings.' };
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        q: query,
        num: maxResults
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Serper API error (${response.status}): ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    const organic = Array.isArray(data?.organic) ? data.organic : [];
    const results = organic.slice(0, maxResults).map((item: any) => ({
      title: item?.title || '',
      url: item?.link || '',
      description: item?.snippet || ''
    }));

    return { results };
  } catch (error: any) {
    console.error('Serper search error:', error);
    return { results: [], error: error.message || 'Serper search failed' };
  }
};
