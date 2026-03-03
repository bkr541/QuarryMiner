import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function extractStructuredData(content: string, schema: any) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // We use a prompt that instructs the model to extract data based on the schema
  const prompt = `
    Extract structured information from the following web content based on the provided JSON schema.
    Return ONLY the JSON object matching the schema.
    
    Content:
    ${content.substring(0, 100000)}
    
    JSON Schema:
    ${JSON.stringify(schema, null, 2)}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("AI extraction failed to return valid JSON");
  }
}
