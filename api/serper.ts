import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SERPER_API_KEY not configured on server.' });
  }

  try {
    const { query, maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ q: query, num: maxResults }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Serper API error (${response.status}): ${errText.substring(0, 200)}` });
    }

    const data = await response.json();
    const organic = Array.isArray(data?.organic) ? data.organic : [];
    const results = organic.slice(0, maxResults).map((item: any) => ({
      title: item?.title || '',
      url: item?.link || '',
      description: item?.snippet || '',
    }));

    return res.status(200).json({ results });

  } catch (error: any) {
    console.error('Serper proxy error:', error);
    return res.status(500).json({ error: error?.message || 'Serper proxy error' });
  }
}
