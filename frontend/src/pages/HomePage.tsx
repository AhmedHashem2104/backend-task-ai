import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Send, RotateCcw } from "lucide-react";
import { generateSequence } from "@/api/client";
import type { TovConfigInput } from "@/types";
import { getTovTierLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ---- Default demo values (real LinkedIn example) ----
const EXAMPLE_URL = "https://www.linkedin.com/in/williamhgates";
const EXAMPLE_COMPANY_CONTEXT =
  "We help enterprise companies modernize their legacy infrastructure with cloud-native solutions, reducing operational costs by 40% on average. Our platform automates migration, monitoring, and optimization across AWS, Azure, and GCP.";
const EXAMPLE_SEQUENCE_LENGTH = 3;

const DEFAULT_TOV: TovConfigInput = {
  formality: 0.7,
  warmth: 0.6,
  directness: 0.5,
  humor: 0.3,
  enthusiasm: 0.5,
};

const EMPTY_TOV: TovConfigInput = {
  formality: 0.5,
  warmth: 0.5,
  directness: 0.5,
  humor: 0.3,
  enthusiasm: 0.5,
};

const TOV_AXES = [
  { key: "formality" as const, label: "Formality", lowLabel: "Casual", highLabel: "Formal" },
  { key: "warmth" as const, label: "Warmth", lowLabel: "Cool", highLabel: "Warm" },
  { key: "directness" as const, label: "Directness", lowLabel: "Consultative", highLabel: "Direct" },
  { key: "humor" as const, label: "Humor", lowLabel: "Serious", highLabel: "Witty" },
  { key: "enthusiasm" as const, label: "Enthusiasm", lowLabel: "Measured", highLabel: "Energetic" },
] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const [prospectUrl, setProspectUrl] = useState(EXAMPLE_URL);
  const [companyContext, setCompanyContext] = useState(EXAMPLE_COMPANY_CONTEXT);
  const [sequenceLength, setSequenceLength] = useState(EXAMPLE_SEQUENCE_LENGTH);
  const [tov, setTov] = useState<TovConfigInput>({ ...DEFAULT_TOV });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await generateSequence({
        prospect_url: prospectUrl,
        company_context: companyContext,
        sequence_length: sequenceLength,
        tov_config: tov,
      });
      navigate(`/sequences/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProspectUrl("");
    setCompanyContext("");
    setSequenceLength(3);
    setTov({ ...EMPTY_TOV });
    setError(null);
  };

  const handleLoadExample = () => {
    setProspectUrl(EXAMPLE_URL);
    setCompanyContext(EXAMPLE_COMPANY_CONTEXT);
    setSequenceLength(EXAMPLE_SEQUENCE_LENGTH);
    setTov({ ...DEFAULT_TOV });
    setError(null);
  };

  const updateTov = (key: keyof TovConfigInput, value: number) => {
    setTov((prev) => ({ ...prev, [key]: value }));
  };

  const isEmpty = !prospectUrl && !companyContext;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header */}
      <div className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold text-foreground">
          <Sparkles className="h-8 w-8 text-primary" />
          Generate Messaging Sequence
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enter a LinkedIn profile URL and configure your tone to generate personalized outreach messages.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LinkedIn URL */}
        <Card>
          <CardHeader className="pb-3">
            <Label htmlFor="prospect-url" className="text-sm font-semibold">
              LinkedIn Profile URL
            </Label>
          </CardHeader>
          <CardContent>
            <Input
              id="prospect-url"
              type="url"
              value={prospectUrl}
              onChange={(e) => setProspectUrl(e.target.value)}
              placeholder="https://linkedin.com/in/john-doe"
              required
              className="h-11"
            />
          </CardContent>
        </Card>

        {/* Company Context */}
        <Card>
          <CardHeader className="pb-3">
            <Label htmlFor="company-context" className="text-sm font-semibold">
              Company Context
            </Label>
          </CardHeader>
          <CardContent>
            <Textarea
              id="company-context"
              value={companyContext}
              onChange={(e) => setCompanyContext(e.target.value)}
              placeholder="Describe what your company does and the value proposition..."
              required
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Sequence Length */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Sequence Length</Label>
              <Badge variant="secondary">{sequenceLength} messages</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Slider
              min={1}
              max={6}
              step={1}
              value={[sequenceLength]}
              onValueChange={([v]: number[]) => setSequenceLength(v)}
            />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>3</span>
              <span>6</span>
            </div>
          </CardContent>
        </Card>

        {/* TOV Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tone of Voice</CardTitle>
            <CardDescription>
              Adjust the sliders to configure how the generated messages should sound.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {TOV_AXES.map(({ key, label, lowLabel, highLabel }) => {
              const value = tov[key] ?? 0.5;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{label}</Label>
                    <Badge variant="outline" className="font-mono text-xs">
                      {getTovTierLabel(value)} &middot; {(value * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[value * 100]}
                    onValueChange={([v]: number[]) => updateTov(key, v / 100)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{lowLabel}</span>
                    <span>{highLabel}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="flex-1 text-base shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating... (30-60s)
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Generate Sequence
              </>
            )}
          </Button>

          {isEmpty ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleLoadExample}
              title="Load example data"
            >
              <Sparkles className="h-4 w-4" />
              Load Example
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleReset}
              title="Clear all fields"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
