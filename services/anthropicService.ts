
export const runAnthropicAgent = async (
  modelId: string, 
  prompt: string, 
  _apiKey?: string, 
  systemInstruction?: string
) => {
  try {
    const response = await fetch('/api/anthropic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, prompt, systemInstruction }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error: any) {
    console.error("Anthropic Error:", error);
    const message = error?.message || String(error);
    return JSON.stringify({ error: `Anthropic call failed: ${message}` });
  }
};
