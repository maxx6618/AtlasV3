
import { GoogleGenAI } from "@google/genai";

const getAI = (apiKey?: string) => {
  const key = apiKey || (typeof process !== 'undefined' ? process.env?.API_KEY : undefined);
  if (!key) throw new Error("API Key not found. Please check your settings.");
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Plain text generation (no JSON mode, no search).
 * Used as a general-purpose Gemini call.
 */
export const runAgentTask = async (
  modelName: string,
  prompt: string,
  systemInstruction?: string,
  apiKey?: string
) => {
  try {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text || "";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const message = error?.message || error?.statusText || String(error);
    throw new Error(`Gemini API error: ${message}`);
  }
};

/**
 * JSON-mode generation (responseMimeType = application/json).
 * Used for structured output without web search.
 */
export const runJSONTask = async (
  modelName: string,
  prompt: string,
  systemInstruction?: string,
  apiKey?: string
): Promise<string> => {
  try {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });
    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }
    // Attach token usage to the returned string for extraction
    const totalTokens = (response as any).usageMetadata?.totalTokenCount 
      || ((response as any).usageMetadata?.promptTokenCount || 0) + ((response as any).usageMetadata?.candidatesTokenCount || 0);
    (runJSONTask as any).__lastTokens = totalTokens || undefined;
    return text;
  } catch (error: any) {
    console.error("Gemini JSON Error:", error);
    const message = error?.message || error?.statusText || String(error);
    throw new Error(`Gemini JSON API error: ${message}`);
  }
};

/** Retrieve the token count from the last runJSONTask call */
export const getLastTokenCount = (): number | undefined => {
  return (runJSONTask as any).__lastTokens;
};

/** Clear the last token count */
export const clearLastTokenCount = () => {
  (runJSONTask as any).__lastTokens = undefined;
};

/**
 * Google Search grounded generation.
 * Uses the googleSearch tool for real-time web results.
 * Does NOT force responseMimeType to avoid conflicting with search grounding.
 * Returns raw text + source URLs from grounding metadata.
 */
export const runSearchAgent = async (
  modelName: string,
  prompt: string,
  systemInstruction?: string,
  apiKey?: string
) => {
  try {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });
    
    const text = response.text || "";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
  } catch (error: any) {
    console.error("Search Error:", error);
    const message = error?.message || String(error);
    return { text: "", sources: [], error: message };
  }
};

/**
 * Multi-step search + JSON structuring.
 * Research steps are capped (default 2, max 5). Final step structures results.
 */
export const runSearchAndStructure = async (
  searchPrompt: string,
  structurePrompt: string,
  outputKeys: string[],
  apiKey?: string,
  maxSteps: number = 2
) => {
  const rawSteps = Number(maxSteps);
  const totalSteps = Number.isFinite(rawSteps) ? Math.min(5, Math.max(2, Math.round(rawSteps))) : 2;
  const researchSteps = Math.max(1, totalSteps - 1);

  let combinedText = '';
  let combinedSources: any[] = [];
  let currentPrompt = searchPrompt;

  for (let step = 1; step <= researchSteps; step++) {
    const stepInstruction = [
      "You are a research agent with real-time web access.",
      `This is research step ${step} of ${researchSteps}.`,
      "Search the web and provide detailed, factual information. Cite your sources.",
      "If another step is needed, end with: FOLLOW_UP: <next query>.",
    ].join(' ');

    const stepPrompt = [
      currentPrompt,
      combinedText ? `\n\nPrevious findings:\n${combinedText}` : ''
    ].filter(Boolean).join('\n');

    const searchResult = await runSearchAgent(
      'gemini-2.5-flash',
      stepPrompt,
      stepInstruction,
      apiKey
    );

    if (searchResult.error || !searchResult.text) {
      throw new Error(searchResult.error || "Search returned no results");
    }

    let stepText = searchResult.text;
    const followUpMatch = stepText.match(/FOLLOW_UP:\s*(.+)/i);
    const followUpQuery = followUpMatch?.[1]?.trim();
    stepText = stepText.replace(/FOLLOW_UP:.*$/im, '').trim();

    if (stepText) {
      combinedText += `${combinedText ? '\n\n' : ''}--- STEP ${step} ---\n${stepText}`;
    }

    if (searchResult.sources?.length) {
      combinedSources = combinedSources.concat(searchResult.sources);
    }

    if (!followUpQuery) {
      break;
    }

    currentPrompt = followUpQuery;
  }

  if (!combinedText) {
    throw new Error("Search returned no results");
  }

  // Final step: Structure the search results into JSON
  const jsonPrompt = [
    `Based on the following web research results, extract and structure the information.`,
    ``,
    `--- RESEARCH RESULTS ---`,
    combinedText,
    `--- END RESULTS ---`,
    ``,
    structurePrompt,
    ``,
    `Return a single JSON object with these keys: ${JSON.stringify(outputKeys)}.`,
    `If information for a key was not found, set its value to null.`,
  ].join('\n');

  const structuredJson = await runJSONTask(
    'gemini-2.5-flash',
    jsonPrompt,
    "You are a data extraction agent. Convert the provided research into a clean JSON object. Only use information from the research results. Do not invent data.",
    apiKey
  );

  return { text: structuredJson, sources: combinedSources };
};
