import { useEffect, useReducer, useState } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Target,
} from "lucide-react";
import { getSequences } from "@/api/client";
import type { SequenceListItem } from "@/types";
import { formatDate, formatConfidence } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FetchState = {
  sequences: SequenceListItem[];
  totalPages: number;
  total: number;
  loading: boolean;
  error: string | null;
};

type FetchAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: { sequences: SequenceListItem[]; totalPages: number; total: number } }
  | { type: "FETCH_ERROR"; payload: string };

const initialFetchState: FetchState = {
  sequences: [],
  totalPages: 1,
  total: 0,
  loading: true,
  error: null,
};

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        sequences: action.payload.sequences,
        totalPages: action.payload.totalPages,
        total: action.payload.total,
        loading: false,
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
  }
}

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [state, dispatch] = useReducer(fetchReducer, initialFetchState);
  const { sequences, totalPages, total, loading, error } = state;

  useEffect(() => {
    dispatch({ type: "FETCH_START" });
    getSequences(page, 10)
      .then((data) =>
        dispatch({
          type: "FETCH_SUCCESS",
          payload: {
            sequences: data.sequences,
            totalPages: data.pagination.total_pages,
            total: data.pagination.total,
          },
        })
      )
      .catch((err) => dispatch({ type: "FETCH_ERROR", payload: err.message }));
  }, [page]);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <History className="h-5 w-5 text-primary" />
            </div>
            Generation History
          </h1>
          {!loading && total > 0 && (
            <p className="mt-1.5 ml-[52px] text-sm text-muted-foreground">
              {total} {total === 1 ? "sequence" : "sequences"} generated
            </p>
          )}
        </div>
        <Button asChild variant="default" size="sm" className="shadow-sm shadow-primary/20">
          <Link to="/">
            <Sparkles className="h-4 w-4" />
            New Sequence
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : sequences.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No sequences yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate your first messaging sequence to see it here.
            </p>
            <Button asChild className="mt-4 shadow-sm shadow-primary/20">
              <Link to="/">
                <Sparkles className="h-4 w-4" />
                Generate Your First Sequence
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {sequences.map((seq) => {
              const statusVariant =
                seq.status === "completed"
                  ? "success"
                  : seq.status === "failed"
                    ? "destructive"
                    : ("warning" as const);

              return (
                <Link key={seq.id} to={`/sequences/${seq.id}`} className="block">
                  <Card className="border-border/50 shadow-sm transition-all hover:border-primary/30 hover:shadow-md group">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 transition-colors group-hover:from-primary/25 group-hover:to-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {seq.prospect_name || "Unknown Prospect"}
                            </h3>
                            <p className="max-w-md truncate text-sm text-muted-foreground">
                              {seq.prospect_headline || seq.prospect_company || "No headline"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>{formatDate(seq.created_at)}</span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {seq.sequence_length} messages
                              </span>
                              {seq.tov_name && (
                                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                                  {seq.tov_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {seq.overall_confidence !== null && (
                            <div className="hidden sm:flex items-center gap-1 text-sm">
                              <Target className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {formatConfidence(seq.overall_confidence)}
                              </span>
                            </div>
                          )}
                          <Badge variant={statusVariant}>{seq.status}</Badge>
                          <ExternalLink className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="shadow-sm"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
