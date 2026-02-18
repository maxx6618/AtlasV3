import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAppSettingsFromSupabase, resolveKey } from './lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const settings = await loadAppSettingsFromSupabase();
  const apiKey = resolveKey(settings, 'anthropicApiKey', 'ANTHROPIC_API_KEY');
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add keys in Settings or set ANTHROPIC_API_KEY env var.' });
  }

  try {
    const { action, modelId, prompt, systemInstruction } = req.body;

    // Test endpoint: validate key
    if (action === 'test') {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2024-10-22',
          'content-type': 'application/json',
        },
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `Anthropic key test failed: ${errText.substring(0, 200)}` });
      }
      return res.status(200).json({ ok: true });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2024-10-22',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId || 'claude-haiku-4-5',
        max_tokens: 4096,
        system: systemInstruction || 'You are a helpful assistant. Always return your response as a valid JSON object.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      return res.status(response.status).json({ error: errMsg });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (error: any) {
    console.error('Anthropic proxy error:', error);
    return res.status(500).json({ error: error?.message || 'Anthropic proxy error' });
  }
}
