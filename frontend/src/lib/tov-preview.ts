/**
 * Frontend-side TOV translator for live preview in the UI.
 * Mirrors the backend tov-translator.ts logic.
 */

type Tier = "low" | "medium" | "high";

function getTier(value: number): Tier {
  if (value <= 0.3) return "low";
  if (value <= 0.7) return "medium";
  return "high";
}

const formalityMap: Record<Tier, string> = {
  low: "Casual, conversational language with contractions and an informal style.",
  medium: "Professional yet approachable. Balanced between formal and conversational.",
  high: "Formal, polished language. No contractions or slang. Respectful and professional.",
};

const warmthMap: Record<Tier, string> = {
  low: "Neutral, businesslike tone focused on facts and value.",
  medium: "Moderately warm and personable, showing genuine interest.",
  high: "Genuinely warm and empathetic, building rapport and personal connection.",
};

const directnessMap: Record<Tier, string> = {
  low: "Indirect, consultative approach. Leads with questions and curiosity.",
  medium: "Moderately direct, stating purpose clearly as a mutual benefit.",
  high: "Very direct and to-the-point. Value proposition stated upfront.",
};

const humorMap: Record<Tier, string> = {
  low: "Serious and professional, no humor.",
  medium: "Light wit where natural, but professional.",
  high: "Clever observations and tasteful humor to make messages memorable.",
};

const enthusiasmMap: Record<Tier, string> = {
  low: "Calm and measured tone.",
  medium: "Moderately positive and enthusiastic.",
  high: "Genuinely excited and energetic about the opportunity.",
};

export function translateTovPreview(params: {
  formality: number;
  warmth: number;
  directness: number;
  humor?: number;
  enthusiasm?: number;
}): string {
  const parts = [
    formalityMap[getTier(params.formality)],
    warmthMap[getTier(params.warmth)],
    directnessMap[getTier(params.directness)],
  ];

  if (params.humor !== undefined) {
    parts.push(humorMap[getTier(params.humor)]);
  }
  if (params.enthusiasm !== undefined) {
    parts.push(enthusiasmMap[getTier(params.enthusiasm)]);
  }

  return parts.join("\n");
}
