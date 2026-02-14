import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  User,
  Building,
  Brain,
  MessageSquare,
  Target,
  ChevronDown,
  Coins,
  ExternalLink,
} from "lucide-react";
import { getSequence } from "@/api/client";
import type { SequenceResponse } from "@/types";
import { formatDate, formatConfidence, formatCost, messageTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sequence, setSequence] = useState<SequenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getSequence(id)
      .then(setSequence)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sequence) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Alert variant="destructive">
          <AlertDescription>{error || "Sequence not found"}</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4">
          <Link to="/">Go back</Link>
        </Button>
      </div>
    );
  }

  const statusVariant =
    sequence.status === "completed"
      ? "success"
      : sequence.status === "failed"
        ? "destructive"
        : ("warning" as const);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
        <Link to="/history">
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Sequence for {sequence.prospect.full_name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Generated {formatDate(sequence.created_at)}
          </p>
        </div>
        <Badge variant={statusVariant}>{sequence.status}</Badge>
      </div>

      {/* Prospect Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-wider">
            Prospect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground">
                {sequence.prospect.full_name}
              </h3>
              <p className="text-sm text-muted-foreground">{sequence.prospect.headline}</p>
              {sequence.prospect.current_company && (
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  {sequence.prospect.current_position} at {sequence.prospect.current_company}
                </div>
              )}
              {sequence.prospect.linkedin_url && (
                <Button variant="link" size="sm" asChild className="mt-1 h-auto p-0">
                  <a
                    href={sequence.prospect.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    LinkedIn Profile
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Target, label: "Confidence", value: formatConfidence(sequence.overall_confidence) },
          { icon: MessageSquare, label: "Messages", value: String((sequence.messages ?? []).length) },
          { icon: Brain, label: "Tokens Used", value: (sequence.ai_metadata?.total_tokens ?? 0).toLocaleString() },
          { icon: Coins, label: "Est. Cost", value: formatCost(sequence.ai_metadata?.total_cost_usd ?? 0) },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="text-center">
            <CardContent className="pt-6">
              <Icon className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prospect Analysis */}
      {sequence.prospect_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-primary" />
              AI Prospect Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">
              {sequence.prospect_analysis.professional_summary}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Key Interests</h4>
                <ul className="space-y-1">
                  {(sequence.prospect_analysis.key_interests ?? []).map((interest, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <span className="mt-0.5 text-primary">&#8226;</span>
                      {interest}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Pain Points</h4>
                <ul className="space-y-1">
                  {(sequence.prospect_analysis.potential_pain_points ?? []).map((point, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <span className="mt-0.5 text-orange-500">&#8226;</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {(sequence.prospect_analysis.personalization_hooks ?? []).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Personalization Hooks
                </h4>
                <div className="space-y-2">
                  {(sequence.prospect_analysis.personalization_hooks ?? []).map((hook, i) => (
                    <div key={i} className="rounded-lg bg-secondary p-3">
                      <p className="text-sm font-medium text-foreground">{hook.hook}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Source: {hook.source} &mdash; {hook.relevance}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages Timeline */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          Message Sequence
        </h2>

        {(sequence.messages ?? []).map((msg) => {
          const confVariant =
            msg.confidence_score >= 0.8
              ? "success"
              : msg.confidence_score >= 0.6
                ? "warning"
                : ("destructive" as const);

          return (
            <Collapsible key={msg.step_number}>
              <Card className="overflow-hidden">
                <CardContent className="pt-6">
                  {/* Message header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {msg.step_number}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {messageTypeLabel(msg.message_type)}
                        </span>
                        {msg.subject && (
                          <p className="text-xs text-muted-foreground">Subject: {msg.subject}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={confVariant}>{formatConfidence(msg.confidence_score)}</Badge>
                  </div>

                  {/* Message Body */}
                  <div className="whitespace-pre-wrap rounded-lg bg-secondary p-4 text-sm leading-relaxed text-foreground">
                    {msg.body}
                  </div>

                  {/* Toggle Thinking */}
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="mt-3 gap-1 text-primary">
                      <Brain className="h-4 w-4" />
                      AI Thinking
                      <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                </CardContent>

                <CollapsibleContent>
                  <Separator />
                  <div className="space-y-4 bg-blue-50/50 p-6">
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">
                        <Brain className="h-4 w-4 text-primary" />
                        Thinking Process
                      </h4>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {msg.thinking_process}
                      </p>
                    </div>

                    {(msg.personalization_points ?? []).length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-foreground">
                          Personalization Points
                        </h4>
                        <div className="space-y-2">
                          {(msg.personalization_points ?? []).map((pp, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <div>
                                <span className="font-medium text-foreground">{pp.point}</span>
                                <span className="text-muted-foreground">
                                  {" "}&mdash; {pp.reasoning} (from: {pp.source})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
