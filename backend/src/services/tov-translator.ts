/**
 * TOV (Tone of Voice) Translator
 *
 * Converts numeric TOV parameters (0.0 - 1.0) into natural language
 * instructions suitable for injection into AI prompts.
 *
 * Each axis has three tiers:
 *   - Low (0.0 - 0.3): casual / relaxed
 *   - Medium (0.3 - 0.7): balanced / moderate
 *   - High (0.7 - 1.0): strong / intense
 */

interface TovParams {
  formality: number;
  warmth: number;
  directness: number;
  humor?: number;
  enthusiasm?: number;
  custom_instructions?: string;
}

type Tier = "low" | "medium" | "high";

function getTier(value: number): Tier {
  if (value <= 0.3) return "low";
  if (value <= 0.7) return "medium";
  return "high";
}

const formalityMap: Record<Tier, string> = {
  low: "Use casual, conversational language. Contractions, colloquialisms, and an informal style are encouraged. Write as if messaging a peer.",
  medium:
    "Use a professional yet approachable tone. Some contractions are fine, but avoid slang. Strike a balance between formal and conversational.",
  high: "Use formal, polished language. Avoid contractions, slang, and overly casual expressions. Address the prospect respectfully and maintain a professional register throughout.",
};

const warmthMap: Record<Tier, string> = {
  low: "Keep the tone neutral and businesslike. Focus on facts and value rather than personal connection. Avoid excessive friendliness.",
  medium:
    "Maintain a moderately warm and personable tone. Show genuine interest in the prospect's work, but avoid being overly familiar or effusive.",
  high: "Be genuinely warm, empathetic, and personable. Show real interest in the prospect as a person. Use language that builds rapport and makes the reader feel valued.",
};

const directnessMap: Record<Tier, string> = {
  low: "Take an indirect, consultative approach. Lead with questions and curiosity rather than pitching. Let the value proposition emerge naturally through conversation.",
  medium:
    "Be moderately direct about the value proposition. State your purpose clearly but frame it as a mutual benefit rather than a hard sell.",
  high: "Be very direct and to-the-point. State the value proposition upfront. Minimize fluff — respect the prospect's time with clear, action-oriented language.",
};

const humorMap: Record<Tier, string> = {
  low: "Keep the tone serious and professional. Avoid humor or lighthearted remarks.",
  medium:
    "A light touch of wit is acceptable where natural, but don't force humor. Keep it professional.",
  high: "Incorporate tasteful humor and clever observations where appropriate. Use wit to make the message memorable, but never at the prospect's expense.",
};

const enthusiasmMap: Record<Tier, string> = {
  low: "Maintain a calm, measured tone. Avoid exclamation marks and overly excited language.",
  medium:
    "Show moderate enthusiasm about the opportunity. Be positive without being over-the-top.",
  high: "Show genuine excitement and energy. Convey passion about the opportunity and how it could help the prospect. Enthusiastic but credible.",
};

/**
 * Translate numeric TOV parameters into a natural language instruction paragraph
 */
export function translateTov(params: TovParams): string {
  const parts: string[] = [
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

  if (params.custom_instructions) {
    parts.push(`Additional instructions: ${params.custom_instructions}`);
  }

  return parts.join("\n\n");
}

/**
 * Generate a short human-readable label for a TOV configuration
 */
export function getTovLabel(params: TovParams): string {
  const fTier = getTier(params.formality);
  const wTier = getTier(params.warmth);
  const dTier = getTier(params.directness);

  const labels: string[] = [];

  if (fTier === "high") labels.push("Formal");
  else if (fTier === "low") labels.push("Casual");

  if (wTier === "high") labels.push("Warm");
  else if (wTier === "low") labels.push("Cool");

  if (dTier === "high") labels.push("Direct");
  else if (dTier === "low") labels.push("Consultative");

  return labels.length > 0 ? labels.join(", ") : "Balanced";
}
