import { nanoid } from "nanoid";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { getOrFetchProspect } from "./linkedin.service";
import { translateTov } from "./tov-translator";
import { analyzeProspect, generateMessages } from "./ai.service";
import { AppError } from "../middleware/error-handler";
import { GenerateSequenceInput, SequenceResponse } from "../types";

/**
 * Main orchestrator: takes a generation request and produces a full sequence.
 *
 * Steps:
 *  1. Fetch / cache the prospect from LinkedIn
 *  2. Create or resolve the TOV config
 *  3. Create a sequence record (status = generating)
 *  4. AI Pass 1: Analyze the prospect
 *  5. AI Pass 2: Generate the message sequence
 *  6. Store everything and return the result
 */
export async function generateSequence(
  input: GenerateSequenceInput
): Promise<SequenceResponse> {
  const now = new Date().toISOString();

  // Step 1: Fetch or retrieve prospect
  const prospect = await getOrFetchProspect(input.prospect_url);

  // Step 2: Resolve TOV config
  let tovConfigId: string;

  if (input.tov_config_id) {
    // Use existing config
    const existing = db
      .select()
      .from(schema.tovConfigs)
      .where(eq(schema.tovConfigs.id, input.tov_config_id))
      .get();
    if (!existing) {
      throw new AppError(404, `TOV config not found: ${input.tov_config_id}`);
    }
    tovConfigId = existing.id;
  } else if (input.tov_config) {
    // Create an inline config
    const configId = nanoid();
    db.insert(schema.tovConfigs)
      .values({
        id: configId,
        name: `Inline (${new Date().toLocaleString()})`,
        formality: input.tov_config.formality,
        warmth: input.tov_config.warmth,
        directness: input.tov_config.directness,
        humor: input.tov_config.humor ?? 0.3,
        enthusiasm: input.tov_config.enthusiasm ?? 0.5,
        custom_instructions: input.tov_config.custom_instructions || null,
        created_at: now,
        updated_at: now,
      })
      .run();
    tovConfigId = configId;
  } else {
    throw new AppError(400, "Either tov_config or tov_config_id must be provided");
  }

  // Load the full TOV config for translation
  const tovConfig = db
    .select()
    .from(schema.tovConfigs)
    .where(eq(schema.tovConfigs.id, tovConfigId))
    .get()!;

  // Step 3: Create sequence record
  const sequenceId = nanoid();
  db.insert(schema.messageSequences)
    .values({
      id: sequenceId,
      prospect_id: prospect.id,
      tov_config_id: tovConfigId,
      company_context: input.company_context,
      sequence_length: input.sequence_length,
      status: "generating",
      created_at: now,
      updated_at: now,
    })
    .run();

  try {
    // Step 4: AI Pass 1 — Analyze the prospect
    console.log(`[Generator] Analyzing prospect: ${prospect.full_name}`);
    const analysis = await analyzeProspect(prospect, input.company_context, sequenceId);

    // Store the analysis
    db.update(schema.messageSequences)
      .set({
        prospect_analysis: JSON.stringify(analysis),
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.messageSequences.id, sequenceId))
      .run();

    // Step 5: AI Pass 2 — Generate messages with TOV
    console.log(`[Generator] Generating ${input.sequence_length} messages...`);
    const tovInstructions = translateTov({
      formality: tovConfig.formality,
      warmth: tovConfig.warmth,
      directness: tovConfig.directness,
      humor: tovConfig.humor ?? undefined,
      enthusiasm: tovConfig.enthusiasm ?? undefined,
      custom_instructions: tovConfig.custom_instructions ?? undefined,
    });

    const result = await generateMessages(
      prospect,
      analysis,
      tovInstructions,
      input.company_context,
      input.sequence_length,
      sequenceId
    );

    // Step 6: Store messages
    for (const msg of result.messages) {
      db.insert(schema.sequenceMessages)
        .values({
          id: nanoid(),
          sequence_id: sequenceId,
          step_number: msg.step_number,
          message_type: msg.message_type,
          subject: msg.subject || null,
          body: msg.body,
          thinking_process: msg.thinking_process,
          confidence_score: msg.confidence_score,
          personalization_points: JSON.stringify(msg.personalization_points),
          created_at: new Date().toISOString(),
        })
        .run();
    }

    // Update sequence status
    db.update(schema.messageSequences)
      .set({
        status: "completed",
        overall_confidence: result.overall_confidence,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.messageSequences.id, sequenceId))
      .run();

    console.log(`[Generator] Sequence ${sequenceId} completed successfully`);

    // Build and return full response
    return buildSequenceResponse(sequenceId);
  } catch (error) {
    // Mark sequence as failed
    db.update(schema.messageSequences)
      .set({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.messageSequences.id, sequenceId))
      .run();

    throw error;
  }
}

/**
 * Build a full response object for a sequence
 */
export function buildSequenceResponse(sequenceId: string): SequenceResponse {
  const sequence = db
    .select()
    .from(schema.messageSequences)
    .where(eq(schema.messageSequences.id, sequenceId))
    .get();

  if (!sequence) {
    throw new AppError(404, "Sequence not found");
  }

  const prospect = db
    .select()
    .from(schema.prospects)
    .where(eq(schema.prospects.id, sequence.prospect_id))
    .get();

  const tovConfig = db
    .select()
    .from(schema.tovConfigs)
    .where(eq(schema.tovConfigs.id, sequence.tov_config_id))
    .get();

  const messages = db
    .select()
    .from(schema.sequenceMessages)
    .where(eq(schema.sequenceMessages.sequence_id, sequenceId))
    .orderBy(schema.sequenceMessages.step_number)
    .all();

  const aiGens = db
    .select()
    .from(schema.aiGenerations)
    .where(eq(schema.aiGenerations.sequence_id, sequenceId))
    .all();

  // Aggregate AI metadata
  const totalTokens = aiGens.reduce((sum, g) => sum + (g.total_tokens || 0), 0);
  const totalCost = aiGens.reduce((sum, g) => sum + (g.estimated_cost_usd || 0), 0);
  const modelsUsed = [...new Set(aiGens.map((g) => g.model))];

  const prospectAnalysis = sequence.prospect_analysis
    ? normalizeProspectAnalysis(JSON.parse(sequence.prospect_analysis))
    : null;

  return {
    id: sequence.id,
    status: sequence.status,
    prospect: {
      id: prospect?.id || "",
      full_name: prospect?.full_name || "Unknown",
      headline: prospect?.headline || "",
      current_company: prospect?.current_company || "",
      current_position: prospect?.current_position || "",
      linkedin_url: prospect?.linkedin_url || "",
    },
    tov_config: {
      id: tovConfig?.id || "",
      name: tovConfig?.name || "",
      formality: tovConfig?.formality || 0.5,
      warmth: tovConfig?.warmth || 0.5,
      directness: tovConfig?.directness || 0.5,
    },
    company_context: sequence.company_context,
    sequence_length: sequence.sequence_length,
    prospect_analysis: prospectAnalysis,
    overall_confidence: sequence.overall_confidence,
    messages: messages.map((m) => ({
      step_number: m.step_number,
      message_type: m.message_type,
      subject: m.subject,
      body: m.body,
      thinking_process: m.thinking_process || "",
      confidence_score: m.confidence_score || 0,
      personalization_points: m.personalization_points
        ? JSON.parse(m.personalization_points)
        : [],
    })),
    ai_metadata: {
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      models_used: modelsUsed,
    },
    created_at: sequence.created_at,
  };
}

/**
 * Ensure all expected array/string fields exist on the prospect analysis,
 * since smaller LLMs may omit some fields from their JSON output.
 */
function normalizeProspectAnalysis(raw: Record<string, unknown>) {
  return {
    professional_summary: typeof raw.professional_summary === "string" ? raw.professional_summary : "",
    key_interests: Array.isArray(raw.key_interests) ? raw.key_interests : [],
    potential_pain_points: Array.isArray(raw.potential_pain_points) ? raw.potential_pain_points : [],
    personalization_hooks: Array.isArray(raw.personalization_hooks) ? raw.personalization_hooks : [],
    recommended_angles: Array.isArray(raw.recommended_angles) ? raw.recommended_angles : [],
    seniority_level: typeof raw.seniority_level === "string" ? raw.seniority_level : "unknown",
  };
}
