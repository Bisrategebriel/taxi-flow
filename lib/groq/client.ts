// FR-AI-01
import Groq from "groq-sdk";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Client is created lazily at module init with an empty fallback so Next.js
// can collect page data without GROQ_API_KEY. The route handler guards the key.
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
