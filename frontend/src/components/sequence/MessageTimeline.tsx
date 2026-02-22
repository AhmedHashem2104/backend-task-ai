import { useState } from "react";
import {
  Brain,
  MessageSquare,
  ChevronDown,
  Copy,
  Check,
  Target,
} from "lucide-react";
import type { GeneratedMessage } from "@/types";
import { formatConfidence, messageTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

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

interface MessageTimelineProps {
  messages: GeneratedMessage[];
}

export function MessageTimeline({ messages }: MessageTimelineProps) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
        <MessageSquare className="h-5 w-5 text-primary" />
        Message Sequence
        <Badge variant="secondary" className="ml-1 font-mono text-xs">
          {messages.length} {messages.length === 1 ? "step" : "steps"}
        </Badge>
      </h2>

      <div className="relative">
        {messages.length > 1 && (
          <div className="absolute left-[22px] top-12 bottom-8 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
        )}

        <div className="space-y-3">
          {messages.map((msg) => {
            const confVariant =
              msg.confidence_score >= 0.8
                ? "success"
                : msg.confidence_score >= 0.6
                  ? "warning"
                  : ("destructive" as const);

            const personalizationPoints = msg.personalization_points ?? [];

            return (
              <Collapsible key={msg.step_number}>
                <Card className="relative overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20">
                          {msg.step_number}
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

                    <div className="whitespace-pre-wrap rounded-xl bg-secondary/50 p-5 text-sm leading-relaxed text-foreground border border-border/30">
                      {msg.body}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {msg.body?.length ?? 0} characters
                      </span>

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

                      {personalizationPoints.length > 0 && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <Target className="h-4 w-4 text-primary" />
                            Personalization Points
                          </h4>
                          <div className="space-y-2">
                            {personalizationPoints.map((pp) => (
                              <div key={`${pp.point}-${pp.source}`} className="flex items-start gap-2 text-sm rounded-lg bg-background/60 p-3 border border-border/30">
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
  );
}
