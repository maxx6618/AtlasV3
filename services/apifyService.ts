
/**
 * Apify integration service.
 * Uses the synchronous API (run-sync-get-dataset-items) for actors that complete within 5 min.
 * Provides Google Search scraping and general web page scraping via Apify actors.
 */

const APIFY_BASE = 'https://api.apify.com/v2';

// Timeout for sync runs (5 min max on Apify side, we wait up to 120s)
const SYNC_TIMEOUT_SECS = 120;

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
  apiToken: string,
  maxResults: number = 10
): Promise<ApifySearchResults> => {
  if (!apiToken) {
    return { results: [], error: 'Apify API token is missing. Add it in Settings.' };
  }

  try {
    const response = await fetch(
      `${APIFY_BASE}/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: query,
          maxPagesPerQuery: 1,
          resultsPerPage: maxResults,
          languageCode: 'en',
          mobileResults: false,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Apify API error (${response.status}): ${errText.substring(0, 200)}`);
    }

    const items: any[] = await response.json();

    if (!items || items.length === 0) {
      return { results: [], error: 'No search results returned' };
    }

    // The scraper returns one item per query, with organicResults inside
    const firstResult = items[0];
    const organicResults: ApifyGoogleResult[] = (firstResult?.organicResults || [])
      .slice(0, maxResults)
      .map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        description: r.description || '',
      }));

    return { results: organicResults };
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
  apiToken: string
): Promise<{ content: string; error?: string }> => {
  if (!apiToken) {
    return { content: '', error: 'Apify API token is missing.' };
  }

  try {
    const response = await fetch(
      `${APIFY_BASE}/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          crawlerType: 'cheerio',
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Apify scrape error (${response.status}): ${errText.substring(0, 200)}`);
    }

    const items: any[] = await response.json();
    const text = items?.[0]?.text || items?.[0]?.markdown || '';
    return { content: text.substring(0, 8000) }; // Cap to avoid token overload
  } catch (error: any) {
    console.error('Apify scrape error:', error);
    return { content: '', error: error.message || 'Apify scrape failed' };
  }
};

/**
 * Full enrichment pipeline: Google search + scrape top results + AI structuring.
 * 1. Search Google via Apify for the query
 * 2. Return the search results with URLs and descriptions for AI to process
 */
export const apifySearchAndCollect = async (
  query: string,
  apiToken: string,
  maxResults: number = 5
): Promise<{ searchResults: ApifyGoogleResult[]; error?: string }> => {
  const { results, error } = await apifyGoogleSearch(query, apiToken, maxResults);

  if (error || results.length === 0) {
    return { searchResults: [], error: error || 'No results found' };
  }

  return { searchResults: results };
};
