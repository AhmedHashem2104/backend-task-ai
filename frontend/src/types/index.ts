export interface TovConfig {
  id: string;
  name: string;
  formality: number;
  warmth: number;
  directness: number;
  humor: number | null;
  enthusiasm: number | null;
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface TovConfigInput {
  formality: number;
  warmth: number;
  directness: number;
  humor?: number;
  enthusiasm?: number;
  custom_instructions?: string;
}

export interface PersonalizationPoint {
  point: string;
  source: string;
  reasoning: string;
}

export interface GeneratedMessage {
  step_number: number;
  message_type: string;
  subject: string | null;
  body: string;
  thinking_process: string;
  confidence_score: number;
  personalization_points: PersonalizationPoint[];
}

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

export interface SequenceListItem {
  id: string;
  status: string;
  company_context: string;
  sequence_length: number;
  overall_confidence: number | null;
  created_at: string;
  prospect_name: string | null;
  prospect_headline: string | null;
  prospect_company: string | null;
  prospect_url: string | null;
  tov_name: string | null;
}

export interface PaginatedResponse<T> {
  sequences: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
}

export interface GenerateSequenceInput {
  prospect_url: string;
  tov_config?: TovConfigInput;
  tov_config_id?: string;
  company_context: string;
  sequence_length: number;
}
