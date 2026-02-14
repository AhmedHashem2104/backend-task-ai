import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, Loader2, ChevronLeft, ChevronRight, User, ExternalLink } from "lucide-react";
import { getSequences } from "@/api/client";
import type { SequenceListItem } from "@/types";
import { formatDate, formatConfidence } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function HistoryPage() {
  const [sequences, setSequences] = useState<SequenceListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSequences(page, 10)
      .then((data) => {
        setSequences(data.sequences);
        setTotalPages(data.pagination.total_pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-2">
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Generation History</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : sequences.length === 0 ? (
        <div className="py-20 text-center">
          <History className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No sequences generated yet.</p>
          <Button variant="link" asChild className="mt-2">
            <Link to="/">Generate your first sequence</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sequences.map((seq) => {
              const statusVariant =
                seq.status === "completed"
                  ? "success"
                  : seq.status === "failed"
                    ? "destructive"
                    : ("warning" as const);

              return (
                <Link key={seq.id} to={`/sequences/${seq.id}`}>
                  <Card className="transition hover:border-primary/30 hover:shadow-md">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground">
                              {seq.prospect_name || "Unknown Prospect"}
                            </h3>
                            <p className="max-w-md truncate text-sm text-muted-foreground">
                              {seq.prospect_headline || seq.prospect_company || "No headline"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(seq.created_at)} &middot; {seq.sequence_length} messages
                              {seq.tov_name && ` \u00B7 ${seq.tov_name}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {seq.overall_confidence !== null && (
                            <span className="text-sm font-medium text-foreground">
                              {formatConfidence(seq.overall_confidence)}
                            </span>
                          )}
                          <Badge variant={statusVariant}>{seq.status}</Badge>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
