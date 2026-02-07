
export const runAnthropicAgent = async (modelId: string, prompt: string, apiKey: string, systemInstruction?: string) => {
  if (!apiKey) {
    return JSON.stringify({ error: "Anthropic API Key missing in settings." });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        // Note: Client-side calls to Anthropic often fail CORS. 
        // In production, this requires a proxy. For this demo, we attempt direct call.
        'dangerously-allow-browser': 'true' 
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1024,
        system: systemInstruction || "You are a helpful assistant. Output valid JSON.",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
       const err = await response.text();
       throw new Error(`Anthropic API Error: ${err}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  } catch (error) {
    console.error("Anthropic Error:", error);
    return JSON.stringify({ error: "Error calling Claude API. Note: Browser calls may be blocked by CORS." });
  }
};
