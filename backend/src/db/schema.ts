import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const prospects = sqliteTable("prospects", {
  id: text("id").primaryKey(),
  linkedin_url: text("linkedin_url").notNull().unique(),
  linkedin_username: text("linkedin_username"),
  full_name: text("full_name"),
  headline: text("headline"),
  summary: text("summary"),
  current_company: text("current_company"),
  current_position: text("current_position"),
  location: text("location"),
  industry: text("industry"),
  profile_data: text("profile_data"), // JSON string
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const tovConfigs = sqliteTable("tov_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  formality: real("formality").notNull(),
  warmth: real("warmth").notNull(),
  directness: real("directness").notNull(),
  humor: real("humor").default(0.3),
  enthusiasm: real("enthusiasm").default(0.5),
  custom_instructions: text("custom_instructions"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const messageSequences = sqliteTable("message_sequences", {
  id: text("id").primaryKey(),
  prospect_id: text("prospect_id")
    .notNull()
    .references(() => prospects.id),
  tov_config_id: text("tov_config_id")
    .notNull()
    .references(() => tovConfigs.id),
  company_context: text("company_context").notNull(),
  sequence_length: integer("sequence_length").notNull(),
  status: text("status").notNull().default("pending"), // pending | generating | completed | failed
  prospect_analysis: text("prospect_analysis"), // JSON string
  overall_confidence: real("overall_confidence"),
  error_message: text("error_message"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const sequenceMessages = sqliteTable("sequence_messages", {
  id: text("id").primaryKey(),
  sequence_id: text("sequence_id")
    .notNull()
    .references(() => messageSequences.id),
  step_number: integer("step_number").notNull(),
  message_type: text("message_type").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  thinking_process: text("thinking_process"),
  confidence_score: real("confidence_score"),
  personalization_points: text("personalization_points"), // JSON string
  created_at: text("created_at").notNull(),
});

export const aiGenerations = sqliteTable("ai_generations", {
  id: text("id").primaryKey(),
  sequence_id: text("sequence_id")
    .notNull()
    .references(() => messageSequences.id),
  generation_type: text("generation_type").notNull(), // prospect_analysis | sequence_generation
  model: text("model").notNull(),
  prompt_tokens: integer("prompt_tokens"),
  completion_tokens: integer("completion_tokens"),
  total_tokens: integer("total_tokens"),
  estimated_cost_usd: real("estimated_cost_usd"),
  latency_ms: integer("latency_ms"),
  raw_prompt: text("raw_prompt"),
  raw_response: text("raw_response"), // JSON string
  status: text("status").notNull(), // success | error | timeout
  error_message: text("error_message"),
  created_at: text("created_at").notNull(),
});
