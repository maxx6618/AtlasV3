import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured on server.');
  return new GoogleGenAI({ apiKey: key });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, model, prompt, systemInstruction, outputKeys, searchPrompt, structurePrompt, maxSteps } = req.body;

    if (!prompt && !searchPrompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const ai = getAI();

    if (action === 'search') {
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: 0.3,
        },
      });

      const text = response.text || '';
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return res.status(200).json({ text, sources });
    }

    if (action === 'searchAndStructure') {
      const rawSteps = Number(maxSteps);
      const totalSteps = Number.isFinite(rawSteps) ? Math.min(5, Math.max(2, Math.round(rawSteps))) : 2;
      const researchSteps = Math.max(1, totalSteps - 1);

      let combinedText = '';
      let combinedSources: any[] = [];
      let currentPrompt = searchPrompt;

      for (let step = 1; step <= researchSteps; step++) {
        const stepInstruction = [
          'You are a research agent with real-time web access.',
          `This is research step ${step} of ${researchSteps}.`,
          'Search the web and provide detailed, factual information. Cite your sources.',
          'If another step is needed, end with: FOLLOW_UP: <next query>.',
        ].join(' ');

        const stepPrompt = [
          currentPrompt,
          combinedText ? `\n\nPrevious findings:\n${combinedText}` : ''
        ].filter(Boolean).join('\n');

        const searchResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: stepPrompt,
          config: {
            systemInstruction: stepInstruction,
            tools: [{ googleSearch: {} }],
            temperature: 0.3,
          },
        });

        const stepText = searchResponse.text || '';
        const stepSources = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        if (!stepText) break;

        const followUpMatch = stepText.match(/FOLLOW_UP:\s*(.+)/i);
        const followUpQuery = followUpMatch?.[1]?.trim();
        const cleanStepText = stepText.replace(/FOLLOW_UP:.*$/im, '').trim();

        if (cleanStepText) {
          combinedText += `${combinedText ? '\n\n' : ''}--- STEP ${step} ---\n${cleanStepText}`;
        }

        if (stepSources?.length) {
          combinedSources = combinedSources.concat(stepSources);
        }

        if (!followUpQuery) break;
        currentPrompt = followUpQuery;
      }

      if (!combinedText) {
        return res.status(200).json({ text: '', sources: [], error: 'Search returned no results' });
      }

      const jsonPrompt = [
        'Based on the following web research results, extract and structure the information.',
        '', '--- RESEARCH RESULTS ---', combinedText, '--- END RESULTS ---', '',
        structurePrompt, '',
        `Return a single JSON object with these keys: ${JSON.stringify(outputKeys)}.`,
        'If information for a key was not found, set its value to null.',
      ].join('\n');

      const jsonResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: jsonPrompt,
        config: {
          systemInstruction: 'You are a data extraction agent. Convert the provided research into a clean JSON object. Only use information from the research results. Do not invent data.',
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const totalTokens = (jsonResponse as any).usageMetadata?.totalTokenCount || 0;
      return res.status(200).json({ text: jsonResponse.text || '', sources: combinedSources, tokens: totalTokens });
    }

    if (action === 'json') {
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: 'Empty response from Gemini API' });
      }

      const totalTokens = (response as any).usageMetadata?.totalTokenCount
        || ((response as any).usageMetadata?.promptTokenCount || 0) + ((response as any).usageMetadata?.candidatesTokenCount || 0);

      return res.status(200).json({ text, tokens: totalTokens || undefined });
    }

    // Default: plain text generation
    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.status(200).json({ text: response.text || '' });

  } catch (error: any) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ error: error?.message || 'Gemini API error' });
  }
}
