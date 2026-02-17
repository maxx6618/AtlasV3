
/**
 * Apify integration service (via serverless proxy).
 * Provides Google Search scraping and general web page scraping via Apify actors.
 */

interface ApifyGoogleResult {
  title: string;
  url: string;
  description: string;
  [key: string]: any;
}

interface ApifySearchResults {
  results: ApifyGoogleResult[];
  error?: string;
}

/**
 * Run Google Search via Apify's Google Search Results Scraper.
 * Returns structured search results with titles, URLs, and descriptions.
 */
export const apifyGoogleSearch = async (
  query: string,
  _apiToken?: string,
  maxResults: number = 10
): Promise<ApifySearchResults> => {
  try {
    const response = await fetch('/api/apify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      return { results: [], error: data.error };
    }
    return { results: data.results || [] };
  } catch (error: any) {
    console.error('Apify Google Search error:', error);
    return { results: [], error: error.message || 'Apify search failed' };
  }
};

/**
 * Scrape a web page using Apify's Web Scraper.
 * Returns the page content as text.
 */
export const apifyScrapeUrl = async (
  url: string,
  _apiToken?: string
): Promise<{ content: string; error?: string }> => {
  try {
    const response = await fetch('/api/apify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'scrape', url }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { content: data.content || '' };
  } catch (error: any) {
    console.error('Apify scrape error:', error);
    return { content: '', error: error.message || 'Apify scrape failed' };
  }
};

/**
 * Full enrichment pipeline: Google search + scrape top results + AI structuring.
 */
export const apifySearchAndCollect = async (
  query: string,
  _apiToken?: string,
  maxResults: number = 5
): Promise<{ searchResults: ApifyGoogleResult[]; error?: string }> => {
  const { results, error } = await apifyGoogleSearch(query, undefined, maxResults);

  if (error || results.length === 0) {
    return { searchResults: [], error: error || 'No results found' };
  }

  return { searchResults: results };
};
