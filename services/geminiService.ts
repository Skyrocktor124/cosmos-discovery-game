import { GoogleGenAI, Type } from "@google/genai";
import { CelestialBody, DiscoveryType } from "../types";
import { GEMINI_MODEL, GEMINI_IMAGE_MODEL, SYSTEM_INSTRUCTION } from "../constants";

// Initialize Gemini Client
// Using process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDiscovery = async (colorTheme: string): Promise<CelestialBody> => {
  try {
    const prompt = `Generate a unique celestial discovery (Planet, Star, Nebula, or Anomaly) that is themed around the color "${colorTheme}". 
    It should have a unique sci-fi name, a vivid visual description, atmosphere details, and rare resources.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The sci-fi name of the discovery." },
            type: { type: Type.STRING, enum: Object.values(DiscoveryType), description: "The classification of the body." },
            description: { type: Type.STRING, description: "A paragraph describing the visual appearance and feeling of the place." },
            colorPrimary: { type: Type.STRING, description: "A hex color code matching the theme." },
            colorSecondary: { type: Type.STRING, description: "A secondary hex color code for contrast." },
            atmosphere: { type: Type.STRING, description: "Composition of the atmosphere or surrounding space." },
            resources: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 valuable resources found here." 
            },
            habitability: { type: Type.NUMBER, description: "Habitability score from 0 to 100." },
            distanceLightYears: { type: Type.NUMBER, description: "Distance from the previous sector." }
          },
          required: ["name", "type", "description", "colorPrimary", "colorSecondary", "atmosphere", "resources", "habitability", "distanceLightYears"],
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No text returned from Gemini");
    }

    const data = JSON.parse(jsonText);
    
    return {
      id: crypto.randomUUID(),
      ...data
    };

  } catch (error) {
    console.error("Gemini generation failed:", error);
    // Fallback in case of API error to prevent game crash
    return {
      id: crypto.randomUUID(),
      name: "Unknown Signal",
      type: DiscoveryType.ANOMALY,
      description: "The scanners are malfunctioning. Unable to resolve visual data due to subspace interference.",
      colorPrimary: "#334155",
      colorSecondary: "#000000",
      atmosphere: "Unknown",
      resources: ["Glitch Data"],
      habitability: 0,
      distanceLightYears: 0
    };
  }
};

export const generateCelestialImage = async (description: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: {
        parts: [
          { text: `Cinematic sci-fi concept art of a celestial body: ${description}. High quality, detailed, space background.` },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
};

export const editCelestialImage = async (currentImage: string, prompt: string): Promise<string | null> => {
   try {
    // Expecting data:image/png;base64,.....
    const [header, base64Data] = currentImage.split(',');
    const mimeType = header.split(':')[1].split(';')[0];

    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
   } catch (e) {
     console.error("Image edit failed", e);
     return null;
   }
};