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
  Copy,
  Check,
  Lightbulb,
  TrendingUp,
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-500">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </Button>
  );
}

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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading sequence...</p>
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

  const messages = sequence.messages ?? [];
  const analysis = sequence.prospect_analysis;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
        <Link to="/history">
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Sequence for {sequence.prospect.full_name}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Generated {formatDate(sequence.created_at)}
          </p>
        </div>
        <Badge variant={statusVariant} className="shrink-0 text-sm px-3 py-1">
          {sequence.status}
        </Badge>
      </div>

      {/* Prospect Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-wider text-primary">
            Prospect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground">
                {sequence.prospect.full_name}
              </h3>
              <p className="text-sm text-muted-foreground">{sequence.prospect.headline}</p>
              {sequence.prospect.current_company && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  {sequence.prospect.current_position} at{" "}
                  <span className="font-medium text-foreground">{sequence.prospect.current_company}</span>
                </div>
              )}
              {sequence.prospect.linkedin_url && (
                <Button variant="link" size="sm" asChild className="mt-1 h-auto gap-1 p-0 text-primary">
                  <a
                    href={sequence.prospect.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View LinkedIn Profile
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Target, label: "Confidence", value: formatConfidence(sequence.overall_confidence), color: "text-green-600" },
          { icon: MessageSquare, label: "Messages", value: String(messages.length), color: "text-blue-600" },
          { icon: Brain, label: "Tokens Used", value: (sequence.ai_metadata?.total_tokens ?? 0).toLocaleString(), color: "text-purple-600" },
          { icon: Coins, label: "Est. Cost", value: formatCost(sequence.ai_metadata?.total_cost_usd ?? 0), color: "text-amber-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-border/50 shadow-sm text-center">
            <CardContent className="py-5">
              <Icon className={`mx-auto mb-2 h-5 w-5 ${color}`} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prospect Analysis */}
      {analysis && (
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
              {(analysis.key_interests ?? []).length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Key Interests
                  </h4>
                  <ul className="space-y-1.5">
                    {(analysis.key_interests ?? []).map((interest, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {interest}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(analysis.potential_pain_points ?? []).length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    Pain Points
                  </h4>
                  <ul className="space-y-1.5">
                    {(analysis.potential_pain_points ?? []).map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {(analysis.personalization_hooks ?? []).length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  Personalization Hooks
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {(analysis.personalization_hooks ?? []).map((hook, i) => (
                    <div key={i} className="rounded-lg border border-border/50 bg-secondary/30 p-3">
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
      )}

      {/* Messages Timeline */}
      {messages.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            Message Sequence
            <Badge variant="secondary" className="ml-1 font-mono text-xs">
              {messages.length} {messages.length === 1 ? "step" : "steps"}
            </Badge>
          </h2>

          <div className="relative">
            {/* Timeline line */}
            {messages.length > 1 && (
              <div className="absolute left-[22px] top-12 bottom-8 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
            )}

            <div className="space-y-3">
              {messages.map((msg, idx) => {
                const confVariant =
                  msg.confidence_score >= 0.8
                    ? "success"
                    : msg.confidence_score >= 0.6
                      ? "warning"
                      : ("destructive" as const);

                return (
                  <Collapsible key={msg.step_number ?? idx}>
                    <Card className="relative overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="pt-6">
                        {/* Message header */}
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20">
                              {msg.step_number ?? idx + 1}
                            </span>
                            <div>
                              <span className="text-sm font-bold text-foreground">
                                {messageTypeLabel(msg.message_type)}
                              </span>
                              {msg.subject && (
                                <p className="text-xs text-muted-foreground">Subject: {msg.subject}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CopyButton text={msg.body} />
                            <Badge variant={confVariant}>
                              {formatConfidence(msg.confidence_score)}
                            </Badge>
                          </div>
                        </div>

                        {/* Message Body */}
                        <div className="whitespace-pre-wrap rounded-xl bg-secondary/50 p-5 text-sm leading-relaxed text-foreground border border-border/30">
                          {msg.body}
                        </div>

                        {/* Character count */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {msg.body?.length ?? 0} characters
                          </span>

                          {/* Toggle Thinking */}
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary/80">
                              <Brain className="h-4 w-4" />
                              AI Thinking
                              <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </CardContent>

                      <CollapsibleContent>
                        <Separator />
                        <div className="space-y-4 bg-primary/[0.02] p-6">
                          {msg.thinking_process && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Brain className="h-4 w-4 text-primary" />
                                Thinking Process
                              </h4>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground rounded-lg bg-background/60 p-3 border border-border/30">
                                {msg.thinking_process}
                              </p>
                            </div>
                          )}

                          {(msg.personalization_points ?? []).length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Target className="h-4 w-4 text-primary" />
                                Personalization Points
                              </h4>
                              <div className="space-y-2">
                                {(msg.personalization_points ?? []).map((pp, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm rounded-lg bg-background/60 p-3 border border-border/30">
                                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    <div>
                                      <span className="font-medium text-foreground">{pp.point}</span>
                                      <span className="text-muted-foreground">
                                        {" "}&mdash; {pp.reasoning}
                                      </span>
                                      <span className="block text-xs text-muted-foreground/70 mt-0.5">
                                        Source: {pp.source}
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
        </div>
      )}
    </div>
  );
}
