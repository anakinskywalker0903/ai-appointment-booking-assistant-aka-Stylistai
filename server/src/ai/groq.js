import Groq from 'groq-sdk';
import { z } from 'zod';
import dotenv from 'dotenv';
import { buildSystemPrompt } from './prompts.js';
import { extractIntent as geminiExtractIntent } from './gemini.js';

dotenv.config();

// Multi-key pool: supports GROQ_API_KEYS="key1,key2,key3" or single GROQ_API_KEY
const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
const GROQ_KEYS = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIdx = 0;

function getActiveGroqClient() {
  if (GROQ_KEYS.length === 0) return null;
  const key = GROQ_KEYS[currentKeyIdx % GROQ_KEYS.length];
  return new Groq({ apiKey: key });
}

function rotateGroqKey() {
  if (GROQ_KEYS.length > 1) {
    currentKeyIdx = (currentKeyIdx + 1) % GROQ_KEYS.length;
    console.log(`[Groq] Rotated to API key #${currentKeyIdx + 1} of ${GROQ_KEYS.length}`);
  }
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

const MODEL_CASCADE = [
  'groq/compound',       // Primary — top quality compound reasoning model
  'groq/compound-mini',  // Fallback — high speed lightweight model
];

function convertHistory(history) {
  return history.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.parts.map(p => p.text).join('\n'),
  }));
}

/**
 * Call Groq with conversation history and extract structured booking intent.
 * Features:
 *  1. Multi-key rotation on 429 rate limit
 *  2. Dual model cascade (compound -> compound-mini)
 *  3. Ultimate fallback to Gemini if all Groq keys/models are exhausted
 */
export async function extractIntent(userMessage, history, services, employees = []) {
  const systemPrompt = buildSystemPrompt(services, employees) + JSON_FORMAT_INSTRUCTIONS;
  const messages = [
    { role: 'system', content: systemPrompt },
    ...convertHistory(history),
    { role: 'user', content: userMessage },
  ];

  let lastError;
  const totalKeysToTry = Math.max(1, GROQ_KEYS.length);

  for (let keyAttempt = 0; keyAttempt < totalKeysToTry; keyAttempt++) {
    const groqClient = getActiveGroqClient();
    if (!groqClient) {
      console.warn('[Groq] No GROQ_API_KEY available, falling back directly to Gemini.');
      break;
    }

    for (const modelName of MODEL_CASCADE) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const completion = await groqClient.chat.completions.create({
            model: modelName,
            messages,
            temperature: 0.2,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
          });

          const raw = completion.choices[0]?.message?.content;
          if (!raw) throw new Error('Groq returned empty response');

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            throw new Error(`Groq returned invalid JSON: ${raw.slice(0, 200)}`);
          }

          const validated = intentSchema.safeParse(parsed);
          if (!validated.success) {
            console.warn(`[Groq] Schema validation failed on ${modelName}:`, validated.error.flatten());
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

          const usage = completion.usage ? {
            promptTokenCount: completion.usage.prompt_tokens,
            candidatesTokenCount: completion.usage.completion_tokens,
            totalTokenCount: completion.usage.total_tokens,
          } : null;

          return { intent: parsed, usage };

        } catch (err) {
          lastError = err;
          const status = err.status || err.statusCode;
          const is429 = status === 429 || err.message?.includes('429') || err.message?.includes('rate_limit');
          const is503 = status === 503 || err.message?.includes('503');

          if (is429) {
            console.warn(`[Groq] 429 Rate limit on key #${currentKeyIdx + 1}. Rotating key...`);
            rotateGroqKey();
            break; // Break model loop to retry with next rotated key
          }

          if (is503 && attempt < 2) {
            console.warn(`[Groq] 503 transient on ${modelName}, retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          if (attempt >= 2 || (!is429 && !is503)) {
            break; // Skip to next model
          }
        }
      }
    }
  }

  // If all Groq keys and models hit rate limits or failed, cascade to Gemini!
  if (process.env.GEMINI_API_KEY) {
    console.warn('[AI Cascade] All Groq keys/models failed. Falling back to Google Gemini...');
    try {
      return await geminiExtractIntent(userMessage, history, services, employees);
    } catch (geminiErr) {
      console.error('[AI Cascade] Gemini fallback also failed:', geminiErr.message);
    }
  }

  throw lastError || new Error('All AI providers exhausted');
}
