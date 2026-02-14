import OpenAI from "openai";
import { env } from "../config/env";
import { AppError } from "../middleware/error-handler";
import { ProspectAnalysis, SequenceGenerationResult } from "../types";
import { nanoid } from "nanoid";
import { db, schema } from "../db";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const PRIMARY_MODEL = "gpt-4o-mini";
const FALLBACK_MODEL = "gpt-4o";
const MAX_RETRIES = 3;

// Cost per 1M tokens (USD) as of 2024/2025
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_TABLE[model] || COST_TABLE["gpt-4o-mini"];
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000;
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call OpenAI with retry logic and fallback model support
 */
async function callOpenAI(
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
        `[AI] Attempt ${attempt}/${MAX_RETRIES} failed (${model}):`,
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

  // If primary model exhausted retries, try fallback
  if (model === PRIMARY_MODEL) {
    console.log(`[AI] Trying fallback model: ${FALLBACK_MODEL}`);
    return callOpenAI(messages, sequenceId, generationType, FALLBACK_MODEL);
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
      content: `You are an expert sales researcher and B2B outreach strategist. Analyze the following LinkedIn prospect profile and provide a structured analysis for personalized outreach.

Your company context: "${companyContext}"

Respond with a JSON object containing:
{
  "professional_summary": "2-3 sentence summary of their career and current role",
  "key_interests": ["list of professional interests based on their profile"],
  "potential_pain_points": ["business challenges they likely face given their role and industry"],
  "personalization_hooks": [
    {
      "hook": "specific detail to reference",
      "source": "where in their profile this came from",
      "relevance": "why this is relevant to your outreach"
    }
  ],
  "recommended_angles": ["messaging angles most likely to resonate"],
  "seniority_level": "entry|mid|senior|executive"
}`,
    },
    {
      role: "user",
      content: `Analyze this prospect for personalized outreach:\n\n${profileSummary}`,
    },
  ];

  const result = await callOpenAI(messages, sequenceId, "prospect_analysis");

  try {
    const analysis = JSON.parse(result.content) as ProspectAnalysis;
    return analysis;
  } catch {
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
      content: `You are an expert B2B sales copywriter crafting a personalized LinkedIn messaging sequence. 

## Tone of Voice Instructions
${tovInstructions}

## Your Company Context
${companyContext}

## Prospect Analysis
${JSON.stringify(analysis, null, 2)}

## Task
Generate a ${sequenceLength}-message LinkedIn outreach sequence for ${prospect.full_name || "this prospect"} (${prospect.current_position || "professional"} at ${prospect.current_company || "their company"}).

Each message should:
1. Build on the previous one (escalating value and urgency)
2. Use specific personalization from the prospect analysis
3. Follow the tone of voice instructions precisely
4. Be concise and appropriate for LinkedIn messaging (max 300 chars for connection request, max 500 chars for follow-ups)

Respond with a JSON object:
{
  "messages": [
    {
      "step_number": 1,
      "message_type": "${messageTypes[0] || "connection_request"}",
      "subject": null,
      "body": "the message text",
      "thinking_process": "explain your reasoning: why this approach, what personalization you used and why, how you applied the tone settings",
      "confidence_score": 0.85,
      "personalization_points": [
        {
          "point": "what was personalized",
          "source": "where the data came from",
          "reasoning": "why this personalization was chosen"
        }
      ]
    }
  ],
  "overall_confidence": 0.82
}

Message types in order: ${messageTypes.join(", ")}`,
    },
    {
      role: "user",
      content: `Generate the ${sequenceLength}-message outreach sequence now. Remember to show your thinking process for each message.`,
    },
  ];

  const result = await callOpenAI(messages, sequenceId, "sequence_generation");

  try {
    const parsed = JSON.parse(result.content) as SequenceGenerationResult;

    // Validate structure
    if (!parsed.messages || !Array.isArray(parsed.messages)) {
      throw new Error("Missing messages array");
    }

    return parsed;
  } catch {
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
