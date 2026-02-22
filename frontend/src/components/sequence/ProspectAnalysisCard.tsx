import { Brain, Lightbulb, TrendingUp, Target } from "lucide-react";
import type { ProspectAnalysis } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProspectAnalysisCardProps {
  analysis: ProspectAnalysis;
}

export function ProspectAnalysisCard({ analysis }: ProspectAnalysisCardProps) {
  const interests = analysis.key_interests ?? [];
  const painPoints = analysis.potential_pain_points ?? [];
  const hooks = analysis.personalization_hooks ?? [];

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          AI Prospect Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.professional_summary && (
          <p className="text-foreground leading-relaxed rounded-lg bg-secondary/50 p-4">
            {analysis.professional_summary}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {interests.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Lightbulb className="h-4 w-4 text-primary" />
                Key Interests
              </h4>
              <ul className="space-y-1.5">
                {interests.map((interest) => (
                  <li key={interest} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {interest}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {painPoints.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                Pain Points
              </h4>
              <ul className="space-y-1.5">
                {painPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {hooks.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" />
              Personalization Hooks
            </h4>
            <div className="grid gap-2 md:grid-cols-2">
              {hooks.map((hook) => (
                <div key={`${hook.hook}-${hook.source}`} className="rounded-lg border border-border/50 bg-secondary/30 p-3">
                  <p className="text-sm font-medium text-foreground">{hook.hook}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <span className="font-medium">Source:</span> {hook.source}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Relevance:</span> {hook.relevance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
