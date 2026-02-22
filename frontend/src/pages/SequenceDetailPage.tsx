import { useEffect, useReducer } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getSequence } from "@/api/client";
import type { SequenceResponse } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProspectCard } from "@/components/sequence/ProspectCard";
import { StatsRow } from "@/components/sequence/StatsRow";
import { ProspectAnalysisCard } from "@/components/sequence/ProspectAnalysisCard";
import { MessageTimeline } from "@/components/sequence/MessageTimeline";

type State = {
  sequence: SequenceResponse | null;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: SequenceResponse }
  | { type: "FETCH_ERROR"; payload: string };

const initialState: State = { sequence: null, loading: true, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { sequence: action.payload, loading: false, error: null };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
  }
}

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { sequence, loading, error } = state;

  useEffect(() => {
    if (!id) return;
    dispatch({ type: "FETCH_START" });
    getSequence(id)
      .then((data) => dispatch({ type: "FETCH_SUCCESS", payload: data }))
      .catch((err) => dispatch({ type: "FETCH_ERROR", payload: err.message }));
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
        <Link to="/history">
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
      </Button>

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

      <ProspectCard prospect={sequence.prospect} />

      <StatsRow
        confidence={sequence.overall_confidence}
        messageCount={(sequence.messages ?? []).length}
        totalTokens={sequence.ai_metadata?.total_tokens ?? 0}
        totalCostUsd={sequence.ai_metadata?.total_cost_usd ?? 0}
      />

      {sequence.prospect_analysis && (
        <ProspectAnalysisCard analysis={sequence.prospect_analysis} />
      )}

      <MessageTimeline messages={sequence.messages ?? []} />
    </div>
  );
}
