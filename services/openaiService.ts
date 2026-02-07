
export const runOpenAIAgent = async (modelId: string, prompt: string, apiKey: string, systemInstruction?: string) => {
  if (!apiKey) {
    // Fallback to env if available, else error
    const envKey = process.env.OPENAI_API_KEY;
    if (!envKey) return JSON.stringify({ error: "OpenAI API Key missing in settings." });
    apiKey = envKey;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemInstruction || "You are a helpful assistant. Return JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI Error:", error);
    return JSON.stringify({ error: "Error calling OpenAI API" });
  }
};
