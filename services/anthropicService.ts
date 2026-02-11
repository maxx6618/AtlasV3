
export const runAnthropicAgent = async (
  modelId: string, 
  prompt: string, 
  apiKey: string, 
  systemInstruction?: string
) => {
  if (!apiKey) {
    return JSON.stringify({ error: "Anthropic API Key missing. Please add it in Settings." });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2024-10-22',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 4096,
        system: systemInstruction || "You are a helpful assistant. Always return your response as a valid JSON object.",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  } catch (error: any) {
    console.error("Anthropic Error:", error);
    const message = error?.message || String(error);

    // Detect CORS errors
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return JSON.stringify({ 
        error: "Anthropic API call blocked by browser CORS policy. Direct browser-to-Anthropic calls require their CORS header. If this persists, try using Google Gemini provider instead." 
      });
    }
    return JSON.stringify({ error: `Anthropic call failed: ${message}` });
  }
};
