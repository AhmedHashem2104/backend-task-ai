import { User, Building, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";

interface ProspectCardProps {
  prospect: {
    full_name: string;
    headline: string;
    current_company: string;
    current_position: string;
    linkedin_url: string;
  };
}

export function ProspectCard({ prospect }: ProspectCardProps) {
  return (
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
              {prospect.full_name || "Unknown Prospect"}
            </h3>
            <p className="text-sm text-muted-foreground">{prospect.headline}</p>
            {prospect.current_company && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                {prospect.current_position} at{" "}
                <span className="font-medium text-foreground">{prospect.current_company}</span>
              </div>
            )}
            {prospect.linkedin_url && (
              <Button variant="link" size="sm" asChild className="mt-1 h-auto gap-1 p-0 text-primary">
                <a
                  href={prospect.linkedin_url}
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
  );
}
