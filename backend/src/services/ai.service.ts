import OpenAI from "openai";
import { env } from "../config/env";
import { AppError } from "../middleware/error-handler";
import { ProspectAnalysis, SequenceGenerationResult } from "../types";
import { nanoid } from "nanoid";
import { db, schema } from "../db";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OLLAMA_BASE_URL,
  timeout: 120_000, // 2 minutes – Ollama can be slow on first inference
});

const PRIMARY_MODEL = env.OLLAMA_MODEL;
const FALLBACK_MODEL = env.OLLAMA_MODEL; // Ollama uses a single local model
const MAX_RETRIES = 3;

// Cost tracking (local Ollama is free, but we keep the structure for logging)
const COST_TABLE: Record<string, { input: number; output: number }> = {
  [env.OLLAMA_MODEL]: { input: 0, output: 0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_TABLE[model] || { input: 0, output: 0 };
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000;
}

/**
 * Extract and parse JSON from an AI response that may contain markdown fences,
 * preamble text, trailing commas, or other common LLM quirks.
 */
function parseJSONFromLLM(raw: string): unknown {
  console.log("[AI] Raw LLM response length:", raw.length);
  console.log("[AI] Raw LLM response (first 500 chars):", raw.slice(0, 500));

  // Step 1: Try direct parse first (fast path)
  try {
    return JSON.parse(raw);
  } catch {
    // continue to extraction
  }

  // Step 2: Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw;
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // continue
    }
  }

  // Step 3: Extract the outermost { ... } from the string
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = raw.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(cleaned);
    } catch {
      // continue to fixups
    }
  }

  // Step 4: Aggressive fixups for common LLM JSON mistakes
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  // Remove control characters (except newline/tab)
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  // Fix single-quoted strings → double-quoted
  cleaned = cleaned.replace(/'/g, '"');

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Step 5: Try to fix truncated JSON by closing open braces/brackets
  let braceCount = 0;
  let bracketCount = 0;
  for (const ch of cleaned) {
    if (ch === "{") braceCount++;
    if (ch === "}") braceCount--;
    if (ch === "[") bracketCount++;
    if (ch === "]") bracketCount--;
  }
  let patched = cleaned;
  while (bracketCount > 0) {
    patched += "]";
    bracketCount--;
  }
  while (braceCount > 0) {
    patched += "}";
    braceCount--;
  }
  // Remove trailing commas again after patching
  patched = patched.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(patched);
  } catch (e) {
    console.error("[AI] All JSON parse attempts failed. Cleaned text (first 1000 chars):", patched.slice(0, 1000));
    throw e;
  }
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Ollama (OpenAI-compatible API) with retry logic
 */
async function callOllama(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  sequenceId: string,
  generationType: string,
  model: string = PRIMARY_MODEL
): Promise<{
  content: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
  latencyMs: number;
}> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();

    try {
      console.log(`[AI] Attempt ${attempt}/${MAX_RETRIES} – model: ${model}, type: ${generationType}`);

      const response = await openai.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096,
      });

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || "{}";
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      console.log(`[AI] Success in ${latencyMs}ms, response length: ${content.length}`);

      // Log successful generation
      db.insert(schema.aiGenerations)
        .values({
          id: nanoid(),
          sequence_id: sequenceId,
          generation_type: generationType,
          model,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          estimated_cost_usd: estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
          latency_ms: latencyMs,
          raw_prompt: JSON.stringify(messages),
          raw_response: content,
          status: "success",
          created_at: new Date().toISOString(),
        })
        .run();

      return { content, usage, model, latencyMs };
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `[AI] Attempt ${attempt}/${MAX_RETRIES} failed (${model}) after ${latencyMs}ms:`,
        lastError.message
      );

      // Log failed attempt
      db.insert(schema.aiGenerations)
        .values({
          id: nanoid(),
          sequence_id: sequenceId,
          generation_type: generationType,
          model,
          latency_ms: latencyMs,
          raw_prompt: JSON.stringify(messages),
          status: attempt < MAX_RETRIES ? "error" : "timeout",
          error_message: lastError.message,
          created_at: new Date().toISOString(),
        })
        .run();

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[AI] Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }

  throw new AppError(502, `AI generation failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

/**
 * AI Pass 1: Analyze prospect profile for personalization opportunities
 */
export async function analyzeProspect(
  prospect: {
    full_name: string | null;
    headline: string | null;
    summary: string | null;
    current_company: string | null;
    current_position: string | null;
    location: string | null;
    industry: string | null;
    profile_data: string | null;
  },
  companyContext: string,
  sequenceId: string
): Promise<ProspectAnalysis> {
  const profileSummary = buildProfileSummary(prospect);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a sales researcher. You MUST respond with ONLY a JSON object, no other text.

Company context: "${companyContext}"

Return this exact JSON structure:
{"professional_summary":"summary here","key_interests":["interest1"],"potential_pain_points":["pain1"],"personalization_hooks":[{"hook":"detail","source":"profile section","relevance":"why relevant"}],"recommended_angles":["angle1"],"seniority_level":"senior"}`,
    },
    {
      role: "user",
      content: `Analyze this prospect profile and return JSON:\n\n${profileSummary}`,
    },
  ];

  const result = await callOllama(messages, sequenceId, "prospect_analysis");

  try {
    const analysis = parseJSONFromLLM(result.content) as ProspectAnalysis;
    return analysis;
  } catch (e) {
    console.error("[AI] Failed to parse prospect analysis. Full raw response:\n", result.content);
    throw new AppError(502, "AI returned invalid JSON for prospect analysis");
  }
}

/**
 * AI Pass 2: Generate the personalized messaging sequence
 */
export async function generateMessages(
  prospect: {
    full_name: string | null;
    headline: string | null;
    current_company: string | null;
    current_position: string | null;
  },
  analysis: ProspectAnalysis,
  tovInstructions: string,
  companyContext: string,
  sequenceLength: number,
  sequenceId: string
): Promise<SequenceGenerationResult> {
  const messageTypes = getMessageTypes(sequenceLength);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a B2B sales copywriter. You MUST respond with ONLY a JSON object, no other text.

Tone: ${tovInstructions}
Company: ${companyContext}
Prospect: ${prospect.full_name || "prospect"}, ${prospect.current_position || "professional"} at ${prospect.current_company || "company"}
Analysis: ${JSON.stringify(analysis)}

Generate ${sequenceLength} LinkedIn messages. Message types: ${messageTypes.join(", ")}

Return this exact JSON structure:
{"messages":[{"step_number":1,"message_type":"${messageTypes[0] || "connection_request"}","subject":null,"body":"message text here","thinking_process":"reasoning here","confidence_score":0.85,"personalization_points":[{"point":"what","source":"where","reasoning":"why"}]}],"overall_confidence":0.82}`,
    },
    {
      role: "user",
      content: `Generate the ${sequenceLength}-message sequence as JSON now.`,
    },
  ];

  const result = await callOllama(messages, sequenceId, "sequence_generation");

  try {
    const parsed = parseJSONFromLLM(result.content) as SequenceGenerationResult;

    // Validate structure
    if (!parsed.messages || !Array.isArray(parsed.messages)) {
      throw new Error("Missing messages array");
    }

    return parsed;
  } catch (e) {
    console.error("[AI] Failed to parse sequence generation. Full raw response:\n", result.content);
    throw new AppError(502, "AI returned invalid JSON for sequence generation");
  }
}

/**
 * Build a human-readable profile summary for the AI prompt
 */
function buildProfileSummary(prospect: {
  full_name: string | null;
  headline: string | null;
  summary: string | null;
  current_company: string | null;
  current_position: string | null;
  location: string | null;
  industry: string | null;
  profile_data: string | null;
}): string {
  const parts: string[] = [];

  if (prospect.full_name) parts.push(`Name: ${prospect.full_name}`);
  if (prospect.headline) parts.push(`Headline: ${prospect.headline}`);
  if (prospect.current_position && prospect.current_company) {
    parts.push(`Current Role: ${prospect.current_position} at ${prospect.current_company}`);
  }
  if (prospect.location) parts.push(`Location: ${prospect.location}`);
  if (prospect.industry) parts.push(`Industry: ${prospect.industry}`);
  if (prospect.summary) parts.push(`Summary: ${prospect.summary}`);

  // Include experience history from raw profile data
  if (prospect.profile_data) {
    try {
      const data = JSON.parse(prospect.profile_data);
      if (data.experiences && Array.isArray(data.experiences)) {
        const expList = data.experiences
          .slice(0, 5)
          .map(
            (e: { title?: string; company?: string; description?: string }) =>
              `  - ${e.title || "Unknown Role"} at ${e.company || "Unknown Company"}${e.description ? `: ${e.description.slice(0, 200)}` : ""}`
          )
          .join("\n");
        parts.push(`Experience:\n${expList}`);
      }
      if (data.education && Array.isArray(data.education)) {
        const eduList = data.education
          .slice(0, 3)
          .map(
            (e: { degree_name?: string; field_of_study?: string; school?: string }) =>
              `  - ${e.degree_name || ""} ${e.field_of_study || ""} at ${e.school || "Unknown School"}`
          )
          .join("\n");
        parts.push(`Education:\n${eduList}`);
      }
    } catch {
      // Ignore JSON parse errors for profile_data
    }
  }

  return parts.join("\n");
}

/**
 * Determine message types based on sequence length
 */
function getMessageTypes(length: number): string[] {
  const types = [
    "connection_request",
    "follow_up_value",
    "case_study",
    "social_proof",
    "direct_ask",
    "breakup",
  ];

  if (length <= 1) return ["connection_request"];
  if (length === 2) return ["connection_request", "follow_up_value"];
  if (length === 3) return ["connection_request", "follow_up_value", "direct_ask"];

  return types.slice(0, length);
}
