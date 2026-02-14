import { z } from "zod";

// ---- Request Schemas ----

export const generateSequenceSchema = z.object({
  prospect_url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (url) => url.includes("linkedin.com/in/"),
      "Must be a LinkedIn profile URL (e.g. https://linkedin.com/in/john-doe)"
    ),
  tov_config: z
    .object({
      formality: z.number().min(0).max(1),
      warmth: z.number().min(0).max(1),
      directness: z.number().min(0).max(1),
      humor: z.number().min(0).max(1).optional().default(0.3),
      enthusiasm: z.number().min(0).max(1).optional().default(0.5),
      custom_instructions: z.string().optional(),
    })
    .optional(),
  tov_config_id: z.string().optional(),
  company_context: z.string().min(5, "Company context must be at least 5 characters"),
  sequence_length: z.number().int().min(1).max(10).default(3),
});

export type GenerateSequenceInput = z.infer<typeof generateSequenceSchema>;

export const createTovConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  formality: z.number().min(0).max(1),
  warmth: z.number().min(0).max(1),
  directness: z.number().min(0).max(1),
  humor: z.number().min(0).max(1).optional().default(0.3),
  enthusiasm: z.number().min(0).max(1).optional().default(0.5),
  custom_instructions: z.string().optional(),
});

export type CreateTovConfigInput = z.infer<typeof createTovConfigSchema>;

export const updateTovConfigSchema = createTovConfigSchema.partial();
export type UpdateTovConfigInput = z.infer<typeof updateTovConfigSchema>;

// ---- AI Response Types ----

export interface ProspectAnalysis {
  professional_summary: string;
  key_interests: string[];
  potential_pain_points: string[];
  personalization_hooks: {
    hook: string;
    source: string;
    relevance: string;
  }[];
  recommended_angles: string[];
  seniority_level: string;
}

export interface GeneratedMessage {
  step_number: number;
  message_type: string;
  subject: string | null;
  body: string;
  thinking_process: string;
  confidence_score: number;
  personalization_points: {
    point: string;
    source: string;
    reasoning: string;
  }[];
}

export interface SequenceGenerationResult {
  messages: GeneratedMessage[];
  overall_confidence: number;
}

// ---- API Response Types ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
}

export interface SequenceResponse {
  id: string;
  status: string;
  prospect: {
    id: string;
    full_name: string;
    headline: string;
    current_company: string;
    current_position: string;
    linkedin_url: string;
  };
  tov_config: {
    id: string;
    name: string;
    formality: number;
    warmth: number;
    directness: number;
  };
  company_context: string;
  sequence_length: number;
  prospect_analysis: ProspectAnalysis | null;
  overall_confidence: number | null;
  messages: GeneratedMessage[];
  ai_metadata: {
    total_tokens: number;
    total_cost_usd: number;
    models_used: string[];
  };
  created_at: string;
}
