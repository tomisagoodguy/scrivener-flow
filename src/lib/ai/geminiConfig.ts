import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL ?? '';

// Models to try in order of preference
export const MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash-lite',
    'gemini-robotics-er-1.5-preview',
    'gemma-3-27b',
    'gemma-3-12b',
    'gemma-3-4b',
    'gemma-3-2b',
    'gemma-3-1b'
];
