import Groq from 'groq-sdk';
import { z } from 'zod';
import dotenv from 'dotenv';
import { buildSystemPrompt } from './prompts.js';
import { extractIntent as extractIntentGemini, getGeminiApiKeys } from './gemini.js';

dotenv.config();

// ── API Key Management & Multi-Key Fallback Pool ─────────────────────────────

export function getGroqApiKeys() {
  const keys = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY.trim());
  if (process.env.GROQ_API_KEY_FALLBACK) keys.push(process.env.GROQ_API_KEY_FALLBACK.trim());
  if (process.env.GROQ_API_KEYS) {
    keys.push(...process.env.GROQ_API_KEYS.split(',').map(k => k.trim()).filter(Boolean));
  }
  return [...new Set(keys.filter(Boolean))];
}

const clientPool = new Map();
function getClientForKey(apiKey) {
  if (!clientPool.has(apiKey)) {
    clientPool.set(apiKey, new Groq({ apiKey }));
  }
  return clientPool.get(apiKey);
}

function maskKey(key) {
  if (!key || key.length < 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

const initialKeys = getGroqApiKeys();
if (initialKeys.length === 0 && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️ [AI Warning] Missing GROQ_API_KEY (and GROQ_API_KEY_FALLBACK). AI chat intent extraction will fail unless configured.');
} else if (initialKeys.length > 1 && process.env.NODE_ENV !== 'test') {
  console.log(`ℹ️ [AI Info] Loaded ${initialKeys.length} Groq API keys with automatic fallback rotation enabled.`);
}


// ── Zod schema to validate Groq's JSON output ───────────────────────────────

const intentSchema = z.object({
  intent: z.enum(['BOOK_APPOINTMENT', 'CHECK_AVAILABILITY', 'CANCEL_APPOINTMENT', 'GENERAL']),
  service: z.string().nullable().optional().default(null),
  date: z.string().nullable().optional().default(null),
  time: z.string().nullable().optional().default(null),
  employeePreference: z.string().nullable().optional().default(null),
  customerName: z.string().nullable().optional().default(null),
  customerEmail: z.string().nullable().optional().default(null),
  confirmationResponse: z.enum(['YES', 'NO']).nullable().optional().default(null),
  missingFields: z.array(z.string()).default([]),
  message: z.string(),
});

// ── JSON schema description for the system prompt ────────────────────────────

const JSON_FORMAT_INSTRUCTIONS = `

RESPONSE FORMAT:
You MUST respond with a valid JSON object and nothing else. No markdown, no code fences, no explanation outside the JSON.
The JSON object must have exactly these fields:
{
  "intent": "BOOK_APPOINTMENT" | "CHECK_AVAILABILITY" | "CANCEL_APPOINTMENT" | "GENERAL",
  "service": "<exact service name from list or null>",
  "date": "<YYYY-MM-DD or null>",
  "time": "<HH:MM 24-hour or null>",
  "employeePreference": "<stylist name or null>",
  "customerName": "<full name or null>",
  "customerEmail": "<email or null>",
  "confirmationResponse": "YES" | "NO" | null,
  "missingFields": ["field1", "field2"],
  "message": "<your friendly reply to the customer>"
}`;

// ── Model cascade ────────────────────────────────────────────────────────────
// Groq's free tier is generous, but we keep a cascade for resilience.

const MODEL_CASCADE = [
  'openai/gpt-oss-120b',    // Primary — 120B high-reasoning model on Groq LPU
  'openai/gpt-oss-20b',     // Fallback — 20B high-speed instant model
  'qwen/qwen3.8-27b',       // Fallback — 27B instruction model
  'groq/compound',          // Compound models if available
  'groq/compound-mini',
];

/**
 * Convert frontend chat history format to Groq/OpenAI messages format.
 * Frontend sends: [{ role: 'user'|'model', parts: [{ text }] }]
 * Groq expects:   [{ role: 'user'|'assistant', content: '...' }]
 */
function convertHistory(history) {
  return history.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.parts.map(p => p.text).join('\n'),
  }));
}

/**
 * Call Groq with conversation history and extract structured booking intent.
 * Uses JSON mode + Zod validation to guarantee structured output.
 * Features automatic API Key fallback rotation and multi-model cascade.
 *
 * @param {string} userMessage - Latest user message
 * @param {Array}  history     - [{role: 'user'|'model', parts: [{text}]}]
 * @param {Array}  services    - Active services from DB
 * @param {Array}  employees   - Active employees from DB
 * @returns {Object} { intent, usage }
 */
export async function extractIntent(userMessage, history, services, employees = []) {
  const keys = getGroqApiKeys();
  if (keys.length === 0) {
    const geminiKeys = getGeminiApiKeys();
    if (geminiKeys.length > 0) {
      console.log('ℹ️ [AI Engine] No Groq keys configured; routing intent extraction to Google Gemini.');
      return await extractIntentGemini(userMessage, history, services, employees);
    }
    throw new Error('No AI API keys found. Please set GROQ_API_KEY or GEMINI_API_KEY in server/.env.');
  }

  const systemPrompt = buildSystemPrompt(services, employees) + JSON_FORMAT_INSTRUCTIONS;
  const messages = [
    { role: 'system', content: systemPrompt },
    ...convertHistory(history),
    { role: 'user', content: userMessage },
  ];

  let lastError;

  // Outer loop: Try keys in sequence (Primary -> Fallback -> Multi-keys)
  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const currentKey = keys[keyIdx];
    const groq = getClientForKey(currentKey);
    let keyRateLimited = false;

    // Inner loop: Try models in cascade
    for (const modelName of MODEL_CASCADE) {
      if (keyRateLimited) break;

      // Each model gets up to 2 attempts (handles transient errors)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const completion = await groq.chat.completions.create({
            model: modelName,
            messages,
            temperature: 0.2,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
          });

          const raw = completion.choices[0]?.message?.content;
          if (!raw) {
            throw new Error('Groq returned empty response');
          }

          // Parse JSON
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            throw new Error(`Groq returned invalid JSON: ${raw.slice(0, 200)}`);
          }

          // Validate with Zod
          const validated = intentSchema.safeParse(parsed);
          if (!validated.success) {
            console.warn(`[Groq] Schema validation failed on ${modelName}:`, validated.error.flatten());
            // Try to use the raw parsed data with defaults for missing fields
            parsed = {
              intent: parsed.intent || 'GENERAL',
              service: parsed.service || null,
              date: parsed.date || null,
              time: parsed.time || null,
              employeePreference: parsed.employeePreference || null,
              customerName: parsed.customerName || null,
              customerEmail: parsed.customerEmail || null,
              confirmationResponse: parsed.confirmationResponse || null,
              missingFields: parsed.missingFields || [],
              message: parsed.message || "I'm sorry, could you rephrase that?",
            };
          } else {
            parsed = validated.data;
          }

          // Build usage info (Groq provides this in the response)
          const usage = completion.usage ? {
            promptTokenCount: completion.usage.prompt_tokens,
            candidatesTokenCount: completion.usage.completion_tokens,
            totalTokenCount: completion.usage.total_tokens,
          } : null;

          if (keyIdx > 0) {
            console.log(`[Groq] Successfully completed request using fallback API key: ${maskKey(currentKey)}`);
          }
          if (modelName !== MODEL_CASCADE[0]) {
            console.log(`[Groq] Used fallback model: ${modelName}`);
          }

          return { intent: parsed, usage };

        } catch (err) {
          lastError = err;

          const status = err.status || err.statusCode;
          const is429 = status === 429 || err.message?.includes('429') || err.message?.includes('rate_limit') || err.message?.includes('quota');
          const is401 = status === 401 || err.message?.includes('Invalid API Key') || err.message?.includes('401');
          const is503 = status === 503 || err.message?.includes('503') || err.message?.includes('Service Unavailable');

          if (is429 || is401) {
            console.warn(`[Groq] ${is429 ? '429 Rate limit / quota' : '401 Authentication'} error on key ${maskKey(currentKey)} (${modelName}).`);
            if (keyIdx < keys.length - 1) {
              console.warn(`[Groq] Switching to fallback API key (${keyIdx + 2}/${keys.length})...`);
              keyRateLimited = true;
              break; // Skip to next key in outer loop
            } else {
              break; // Skip to next model if this was the last key
            }
          }

          if (is503 && attempt < 2) {
            console.warn(`[Groq] 503 transient on ${modelName}, retrying in 2s (attempt ${attempt}/2)`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          // Non-retryable error on this model — try next
          if (attempt >= 2 || (!is429 && !is503)) {
            console.warn(`[Groq] Error on ${modelName} (key: ${maskKey(currentKey)}): ${err.message}. Trying next model.`);
            break;
          }
        }
      }
    }
  }

  // All Groq keys and models exhausted — if Gemini API key exists, fallback to Gemini!
  const geminiKeys = getGeminiApiKeys();
  if (geminiKeys.length > 0) {
    try {
      console.warn('⚠️ [AI Fallback] All Groq models/keys failed. Failing over to Google Gemini...');
      return await extractIntentGemini(userMessage, history, services, employees);
    } catch (geminiErr) {
      console.error('[AI Fallback] Gemini fallback failed:', geminiErr.message);
    }
  }

  // All keys and models exhausted
  throw lastError;
}
