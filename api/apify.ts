import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAppSettingsFromSupabase, resolveKey } from './lib/supabase';

const APIFY_BASE = 'https://api.apify.com/v2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const settings = await loadAppSettingsFromSupabase();
  const apiToken = resolveKey(settings, 'apifyApiKey', 'APIFY_API_KEY');
  if (!apiToken) {
    return res.status(500).json({ error: 'APIFY_API_KEY not configured. Add keys in Settings or set APIFY_API_KEY env var.' });
  }

  try {
    const { action, query, url, maxResults = 10 } = req.body;

    if (action === 'scrape') {
      if (!url) {
        return res.status(400).json({ error: 'url is required for scrape action' });
      }

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
        return res.status(response.status).json({ error: `Apify scrape error (${response.status}): ${errText.substring(0, 200)}` });
      }

      const items: any[] = await response.json();
      const text = items?.[0]?.text || items?.[0]?.markdown || '';
      return res.status(200).json({ content: text.substring(0, 8000) });
    }

    // Default: Google search
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

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
      return res.status(response.status).json({ error: `Apify API error (${response.status}): ${errText.substring(0, 200)}` });
    }

    const items: any[] = await response.json();

    if (!items || items.length === 0) {
      return res.status(200).json({ results: [], error: 'No search results returned' });
    }

    const firstResult = items[0];
    const results = (firstResult?.organicResults || [])
      .slice(0, maxResults)
      .map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        description: r.description || '',
      }));

    return res.status(200).json({ results });

  } catch (error: any) {
    console.error('Apify proxy error:', error);
    return res.status(500).json({ error: error?.message || 'Apify proxy error' });
  }
}
