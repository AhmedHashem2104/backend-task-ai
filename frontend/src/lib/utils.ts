import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatConfidence(score: number | null): string {
  if (score === null || score === undefined) return "N/A";
  return `${Math.round(score * 100)}%`;
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(4)}`;
}

export function messageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    connection_request: "Connection Request",
    follow_up_value: "Follow-Up (Value)",
    case_study: "Case Study",
    social_proof: "Social Proof",
    direct_ask: "Direct Ask",
    breakup: "Breakup",
  };
  return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getTovTierLabel(value: number): string {
  if (value <= 0.3) return "Low";
  if (value <= 0.7) return "Medium";
  return "High";
}
