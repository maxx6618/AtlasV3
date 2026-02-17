
/**
 * Plain text generation (no JSON mode, no search).
 * Used as a general-purpose Gemini call.
 */
export const runAgentTask = async (
  modelName: string,
  prompt: string,
  systemInstruction?: string,
  _apiKey?: string
) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, prompt, systemInstruction }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const message = error?.message || String(error);
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
  _apiKey?: string
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'json', model: modelName, prompt, systemInstruction }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.text) {
      throw new Error("Empty response from Gemini API");
    }

    (runJSONTask as any).__lastTokens = data.tokens || undefined;
    return data.text;
  } catch (error: any) {
    console.error("Gemini JSON Error:", error);
    const message = error?.message || String(error);
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
 */
export const runSearchAgent = async (
  modelName: string,
  prompt: string,
  systemInstruction?: string,
  _apiKey?: string
) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', model: modelName, prompt, systemInstruction }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { text: data.text || "", sources: data.sources || [] };
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
  _apiKey?: string,
  maxSteps: number = 2
) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'searchAndStructure',
        searchPrompt,
        structurePrompt,
        outputKeys,
        maxSteps,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    (runJSONTask as any).__lastTokens = data.tokens || undefined;
    return { text: data.text || "", sources: data.sources || [] };
  } catch (error: any) {
    console.error("SearchAndStructure Error:", error);
    throw error;
  }
};
