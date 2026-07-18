import { GoogleGenerativeAI } from "@google/generative-ai";

// Reads GEMINI_API_KEY from the environment. Server-side only — never
// import this from a "use client" component, the key must not reach the
// browser bundle.
export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
}
