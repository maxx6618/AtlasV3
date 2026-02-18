import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAppSettingsFromSupabase, resolveKey } from './lib/supabase';

const JSON_FORMAT_MODELS = ['gpt-4o', 'gpt-4o-mini'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const settings = await loadAppSettingsFromSupabase();
  const apiKey = resolveKey(settings, 'openaiApiKey', 'OPENAI_API_KEY');
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured. Add keys in Settings or set OPENAI_API_KEY env var.' });
  }

  try {
    const { action, modelId, prompt, systemInstruction } = req.body;

    // Test endpoint: validate key
    if (action === 'test') {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `OpenAI key test failed: ${errText.substring(0, 200)}` });
      }
      return res.status(200).json({ ok: true });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const model = modelId || 'gpt-4o-mini';
    const supportsJsonFormat = JSON_FORMAT_MODELS.some(m => model.startsWith(m));

    const body: any = {
      model,
      messages: [
        {
          role: 'system',
          content: systemInstruction || 'You are a helpful assistant. Always return your response as a valid JSON object.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    };

    if (supportsJsonFormat) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      return res.status(response.status).json({ error: `OpenAI API error: ${errMsg}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });

  } catch (error: any) {
    console.error('OpenAI proxy error:', error);
    return res.status(500).json({ error: error?.message || 'OpenAI proxy error' });
  }
}
