import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
import { buildSystemPrompt } from './prompts.js';

dotenv.config();

// ── Multi-Key Pool for Gemini ───────────────────────────────────────────────

export function getGeminiApiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
  if (process.env.GEMINI_API_KEY_FALLBACK) keys.push(process.env.GEMINI_API_KEY_FALLBACK.trim());
  if (process.env.GEMINI_API_KEYS) {
    keys.push(...process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean));
  }
  return [...new Set(keys.filter(Boolean))];
}

const geminiClientPool = new Map();
function getGeminiClientForKey(apiKey) {
  if (!geminiClientPool.has(apiKey)) {
    geminiClientPool.set(apiKey, new GoogleGenerativeAI(apiKey));
  }
  return geminiClientPool.get(apiKey);
}

function maskKey(key) {
  if (!key || key.length < 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

// ── Structured Output Schema ────────────────────────────────────────────────

const intentSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intent: {
      type: SchemaType.STRING,
      enum: ['BOOK_APPOINTMENT', 'CHECK_AVAILABILITY', 'CANCEL_APPOINTMENT', 'GENERAL'],
      description: "The user's primary intent",
    },
    service: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Matched service name exactly as in available services list, or null',
    },
    date: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Appointment date in YYYY-MM-DD format, or null',
    },
    time: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Appointment time in HH:MM 24-hour format, or null',
    },
    employeePreference: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Name of preferred stylist/employee if mentioned, or null if no preference',
    },
    customerName: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Customer full name, or null if not provided',
    },
    customerEmail: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Customer email address, or null if not provided',
    },
    confirmationResponse: {
      type: SchemaType.STRING,
      nullable: true,
      enum: ['YES', 'NO'],
      description: 'Whether the user confirmed a pending booking: YES, NO, or null',
    },
    missingFields: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Fields still needed to complete a BOOK_APPOINTMENT',
    },
    message: {
      type: SchemaType.STRING,
      description: 'The conversational reply to show the user',
    },
  },
  required: ['intent', 'missingFields', 'message'],
};

// ── Model cascade ────────────────────────────────────────────────────────────
// Production Google Gemini models in order of latency and free tier quota
const MODEL_CASCADE = [
  'gemini-3.8-flash',     // Latest 3.8 flash model
  'gemini-3.5-flash',     // High-speed production model
  'gemini-3.1-flash-lite',// Lightweight instant model
  'gemini-3.5-flash-lite',
];

/**
 * Call Gemini with conversation history and extract structured booking intent.
 * Features automatic key rotation and model fallback.
 */
export async function extractIntent(userMessage, history, services, employees = []) {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error('No GEMINI_API_KEY found. Please set GEMINI_API_KEY in server/.env.');
  }

  const systemInstruction = buildSystemPrompt(services, employees);
  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema: intentSchema,
    temperature: 0.2,
  };

  let lastError;

  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const currentKey = keys[keyIdx];
    const genAI = getGeminiClientForKey(currentKey);
    let keyRateLimited = false;

    for (const modelName of MODEL_CASCADE) {
      if (keyRateLimited) break;

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig,
      });

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(userMessage);
          const raw = result.response.text();
          const usage = result.response.usageMetadata;

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            throw new Error(`Gemini returned invalid JSON: ${raw.slice(0, 200)}`);
          }

          if (keyIdx > 0) {
            console.log(`[Gemini] Successfully completed using fallback API key: ${maskKey(currentKey)}`);
          }
          if (modelName !== MODEL_CASCADE[0]) {
            console.log(`[Gemini] Used fallback model: ${modelName}`);
          }

          return { intent: parsed, usage };

        } catch (err) {
          lastError = err;
          const is429 = err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota');
          const is503 = err.status === 503 || err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('Service Unavailable');

          if (is429) {
            console.warn(`[Gemini] 429 Quota exceeded on key ${maskKey(currentKey)} (${modelName}).`);
            if (keyIdx < keys.length - 1) {
              console.warn(`[Gemini] Rotating to fallback API key (${keyIdx + 2}/${keys.length})...`);
              keyRateLimited = true;
              break;
            } else {
              break;
            }
          }

          if (is503 && attempt < 2) {
            console.warn(`[Gemini] 503 transient on ${modelName}, retrying in 2s (attempt ${attempt}/2)`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          console.warn(`[Gemini] Error on ${modelName} (key: ${maskKey(currentKey)}): ${err.message}. Trying next model.`);
          break;
        }
      }
    }
  }

  throw lastError;
}
