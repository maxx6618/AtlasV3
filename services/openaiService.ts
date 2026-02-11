
// Models that support response_format: json_object
const JSON_FORMAT_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];

export const runOpenAIAgent = async (
  modelId: string, 
  prompt: string, 
  apiKey: string, 
  systemInstruction?: string
) => {
  if (!apiKey) {
    return JSON.stringify({ error: "OpenAI API Key missing. Please add it in Settings." });
  }

  try {
    const supportsJsonFormat = JSON_FORMAT_MODELS.some(m => modelId.startsWith(m));

    const body: any = {
      model: modelId,
      messages: [
        { 
          role: "system", 
          content: systemInstruction || "You are a helpful assistant. Always return your response as a valid JSON object." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    };

    // Only add response_format for models that support it
    if (supportsJsonFormat) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI API error: ${errMsg}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    const message = error?.message || String(error);
    return JSON.stringify({ error: `OpenAI call failed: ${message}` });
  }
};
