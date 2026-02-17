import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured on server.' });
  }

  try {
    const { text, voiceId, model_id, voice_settings } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({ error: 'text and voiceId are required' });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: model_id || 'eleven_turbo_v2_5',
          voice_settings: voice_settings || {
            stability: 0.75,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: `ElevenLabs error: ${response.status}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);

  } catch (error: any) {
    console.error('ElevenLabs proxy error:', error);
    return res.status(500).json({ error: error?.message || 'ElevenLabs proxy error' });
  }
}
