
import { GoogleGenAI, Type } from "@google/genai";

const getAI = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("API Key not found. Please check your settings.");
  return new GoogleGenAI({ apiKey: key });
};

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
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const runJSONTask = async (
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
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });
    return response.text || "{}";
  } catch (error) {
    console.error("Gemini JSON Error:", error);
    throw error;
  }
};

export const runSearchAgent = async (prompt: string, apiKey?: string) => {
  try {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json' 
      },
    });
    
    const text = response.text || "{}";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
  } catch (error) {
    console.error("Search Error:", error);
    return { text: JSON.stringify({ error: "Search failed", details: String(error) }), sources: [] };
  }
};
