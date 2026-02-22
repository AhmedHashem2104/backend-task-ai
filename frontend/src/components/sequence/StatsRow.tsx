import { Target, MessageSquare, Brain, Coins } from "lucide-react";
import { formatConfidence, formatCost } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatsRowProps {
  confidence: number | null;
  messageCount: number;
  totalTokens: number;
  totalCostUsd: number;
}

const STATS_CONFIG = [
  { key: "confidence", icon: Target, label: "Confidence", color: "text-green-600" },
  { key: "messages", icon: MessageSquare, label: "Messages", color: "text-blue-600" },
  { key: "tokens", icon: Brain, label: "Tokens Used", color: "text-purple-600" },
  { key: "cost", icon: Coins, label: "Est. Cost", color: "text-amber-600" },
] as const;

export function StatsRow({ confidence, messageCount, totalTokens, totalCostUsd }: StatsRowProps) {
  const values: Record<string, string> = {
    confidence: formatConfidence(confidence),
    messages: String(messageCount),
    tokens: totalTokens.toLocaleString(),
    cost: formatCost(totalCostUsd),
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STATS_CONFIG.map(({ key, icon: Icon, label, color }) => (
        <Card key={key} className="border-border/50 shadow-sm text-center">
          <CardContent className="py-5">
            <Icon className={`mx-auto mb-2 h-5 w-5 ${color}`} />
            <p className="text-2xl font-bold text-foreground">{values[key]}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
