import { useState, useEffect, useRef, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Sparkles,
  Send,
  RotateCcw,
  Search,
  Brain,
  MessageSquare,
  CheckCircle2,
  Circle,
  Zap,
} from "lucide-react";
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

// ---- Default demo values ----
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

const GENERATION_STEPS = [
  { id: "fetch", icon: Search, label: "Fetching LinkedIn profile", duration: 5000 },
  { id: "analyze", icon: Brain, label: "Analyzing prospect with AI", duration: 20000 },
  { id: "generate", icon: MessageSquare, label: "Generating personalized messages", duration: 30000 },
  { id: "finalize", icon: CheckCircle2, label: "Finalizing sequence", duration: 5000 },
];

// ---- Form state reducer ----
type FormState = {
  prospectUrl: string;
  companyContext: string;
  sequenceLength: number;
  tov: TovConfigInput;
  loading: boolean;
  error: string | null;
};

type FormAction =
  | { type: "SET_PROSPECT_URL"; payload: string }
  | { type: "SET_COMPANY_CONTEXT"; payload: string }
  | { type: "SET_SEQUENCE_LENGTH"; payload: number }
  | { type: "SET_TOV_AXIS"; key: keyof TovConfigInput; value: number }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_ERROR"; payload: string }
  | { type: "SUBMIT_END" }
  | { type: "RESET" }
  | { type: "LOAD_EXAMPLE" };

const initialFormState: FormState = {
  prospectUrl: EXAMPLE_URL,
  companyContext: EXAMPLE_COMPANY_CONTEXT,
  sequenceLength: EXAMPLE_SEQUENCE_LENGTH,
  tov: { ...DEFAULT_TOV },
  loading: false,
  error: null,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_PROSPECT_URL":
      return { ...state, prospectUrl: action.payload };
    case "SET_COMPANY_CONTEXT":
      return { ...state, companyContext: action.payload };
    case "SET_SEQUENCE_LENGTH":
      return { ...state, sequenceLength: action.payload };
    case "SET_TOV_AXIS":
      return { ...state, tov: { ...state.tov, [action.key]: action.value } };
    case "SUBMIT_START":
      return { ...state, loading: true, error: null };
    case "SUBMIT_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SUBMIT_END":
      return { ...state, loading: false };
    case "RESET":
      return { ...state, prospectUrl: "", companyContext: "", sequenceLength: 3, tov: { ...EMPTY_TOV }, error: null };
    case "LOAD_EXAMPLE":
      return { ...initialFormState };
  }
}

function GeneratingOverlay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timers = GENERATION_STEPS.map((step, i) => {
      const delay = GENERATION_STEPS.slice(0, i).reduce((sum, s) => sum + s.duration, 0);
      return setTimeout(() => setCurrentStep(i), delay);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-md border-primary/20 shadow-2xl">
        <CardContent className="pt-8 pb-8">
          <div className="mb-6 text-center">
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground">Generating Your Sequence</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This may take 30-90 seconds with a local model
            </p>
          </div>

          <div className="space-y-2">
            {GENERATION_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-500 ${
                    isActive
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : isDone
                        ? "opacity-60"
                        : "opacity-30"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isActive ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/60"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary/50" />
                  )}
                  {isDone && (
                    <span className="ml-auto text-xs text-green-500">Done</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <span className="font-mono text-sm text-muted-foreground">
              Elapsed: {formatTime(elapsed)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(formReducer, initialFormState);
  const { prospectUrl, companyContext, sequenceLength, tov, loading, error } = state;
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SUBMIT_START" });

    try {
      const result = await generateSequence({
        prospect_url: prospectUrl,
        company_context: companyContext,
        sequence_length: sequenceLength,
        tov_config: tov,
      });
      navigate(`/sequences/${result.id}`);
    } catch (err) {
      dispatch({ type: "SUBMIT_ERROR", payload: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      dispatch({ type: "SUBMIT_END" });
    }
  };

  const isEmpty = !prospectUrl && !companyContext;

  return (
    <>
      {loading && <GeneratingOverlay />}

      <div className="mx-auto max-w-3xl">
        {/* Hero section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Generate Messaging Sequence
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Enter a LinkedIn profile URL and configure your tone of voice to generate
            AI-powered personalized outreach messages.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          {/* LinkedIn URL */}
          <Card className="overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Search className="h-4 w-4 text-primary" />
                LinkedIn Profile URL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                id="prospect-url"
                type="url"
                value={prospectUrl}
                onChange={(e) => dispatch({ type: "SET_PROSPECT_URL", payload: e.target.value })}
                placeholder="https://linkedin.com/in/john-doe"
                required
                className="h-11 border-border/50 bg-secondary/30 transition-colors focus:bg-background"
              />
            </CardContent>
          </Card>

          {/* Company Context */}
          <Card className="overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-primary" />
                Company Context
              </CardTitle>
              <CardDescription>
                Describe what your company does and the value you bring to customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="company-context"
                value={companyContext}
                onChange={(e) => dispatch({ type: "SET_COMPANY_CONTEXT", payload: e.target.value })}
                placeholder="Describe what your company does and the value proposition..."
                required
                rows={3}
                className="resize-none border-border/50 bg-secondary/30 transition-colors focus:bg-background"
              />
            </CardContent>
          </Card>

          {/* Sequence Length */}
          <Card className="overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Sequence Length</CardTitle>
                <Badge variant="secondary" className="font-mono">
                  {sequenceLength} {sequenceLength === 1 ? "message" : "messages"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Slider
                min={1}
                max={6}
                step={1}
                value={[sequenceLength]}
                onValueChange={([v]: number[]) => dispatch({ type: "SET_SEQUENCE_LENGTH", payload: v })}
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>1 msg</span>
                <span>3 msgs</span>
                <span>6 msgs</span>
              </div>
            </CardContent>
          </Card>

          {/* TOV Configuration */}
          <Card className="overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="h-4 w-4 text-primary" />
                Tone of Voice
              </CardTitle>
              <CardDescription>
                Fine-tune how the AI should craft your messages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {TOV_AXES.map(({ key, label, lowLabel, highLabel }) => {
                const value = tov[key] ?? 0.5;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{label}</Label>
                      <Badge variant="outline" className="font-mono text-xs">
                        {getTovTierLabel(value)} &middot; {(value * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[value * 100]}
                      onValueChange={([v]: number[]) => dispatch({ type: "SET_TOV_AXIS", key, value: v / 100 })}
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
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1 duration-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="flex-1 text-base shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
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
                onClick={() => dispatch({ type: "LOAD_EXAMPLE" })}
                title="Load example data"
                className="shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Load Example
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => dispatch({ type: "RESET" })}
                title="Clear all fields"
                className="shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
