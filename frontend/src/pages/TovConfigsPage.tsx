import { useEffect, useState, useReducer } from "react";
import { Settings, Plus, Loader2, Trash2, Save } from "lucide-react";
import { getTovConfigs, createTovConfig, deleteTovConfig } from "@/api/client";
import type { TovConfig } from "@/types";
import { getTovTierLabel, formatDate } from "@/lib/utils";
import { translateTovPreview } from "@/lib/tov-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function TovConfigsPage() {
  const [configs, setConfigs] = useState<TovConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchConfigs = () => {
    setLoading(true);
    getTovConfigs()
      .then(setConfigs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this TOV config?")) return;
    try {
      await deleteTovConfig(id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          TOV Configs
        </h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4" />
          New Config
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New TOV Config</DialogTitle>
            <DialogDescription>
              Create a reusable tone of voice preset for your messaging sequences.
            </DialogDescription>
          </DialogHeader>
          <CreateConfigForm
            onCreated={() => {
              setShowCreate(false);
              fetchConfigs();
            }}
          />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : configs.length === 0 ? (
        <div className="py-20 text-center">
          <Settings className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No TOV configs yet.</p>
          <Button variant="link" onClick={() => setShowCreate(true)} className="mt-2">
            Create your first config
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {configs.map((config) => (
            <Card key={config.id} className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{config.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(config.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["formality", "warmth", "directness"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-20 text-xs capitalize text-muted-foreground">{key}</span>
                    <Progress value={config[key] * 100} className="flex-1" />
                    <Badge variant="outline" className="w-16 justify-center text-xs">
                      {getTovTierLabel(config[key])}
                    </Badge>
                  </div>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">
                  Created {formatDate(config.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type ConfigFormState = {
  name: string;
  formality: number;
  warmth: number;
  directness: number;
  humor: number;
  enthusiasm: number;
  customInstructions: string;
  saving: boolean;
  error: string | null;
};

type ConfigFormAction =
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_AXIS"; key: "formality" | "warmth" | "directness" | "humor" | "enthusiasm"; value: number }
  | { type: "SET_CUSTOM_INSTRUCTIONS"; payload: string }
  | { type: "SAVE_START" }
  | { type: "SAVE_ERROR"; payload: string }
  | { type: "SAVE_END" };

const initialConfigForm: ConfigFormState = {
  name: "",
  formality: 0.5,
  warmth: 0.5,
  directness: 0.5,
  humor: 0.3,
  enthusiasm: 0.5,
  customInstructions: "",
  saving: false,
  error: null,
};

function configFormReducer(state: ConfigFormState, action: ConfigFormAction): ConfigFormState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.payload };
    case "SET_AXIS":
      return { ...state, [action.key]: action.value };
    case "SET_CUSTOM_INSTRUCTIONS":
      return { ...state, customInstructions: action.payload };
    case "SAVE_START":
      return { ...state, saving: true, error: null };
    case "SAVE_ERROR":
      return { ...state, saving: false, error: action.payload };
    case "SAVE_END":
      return { ...state, saving: false };
  }
}

const TOV_AXES = [
  { key: "formality" as const, label: "Formality", low: "Casual", high: "Formal" },
  { key: "warmth" as const, label: "Warmth", low: "Cool", high: "Warm" },
  { key: "directness" as const, label: "Directness", low: "Consultative", high: "Direct" },
  { key: "humor" as const, label: "Humor", low: "Serious", high: "Witty" },
  { key: "enthusiasm" as const, label: "Enthusiasm", low: "Measured", high: "Energetic" },
] as const;

function CreateConfigForm({ onCreated }: { onCreated: () => void }) {
  const [state, dispatch] = useReducer(configFormReducer, initialConfigForm);
  const { name, formality, warmth, directness, humor, enthusiasm, customInstructions, saving, error } = state;

  const preview = translateTovPreview({ formality, warmth, directness, humor, enthusiasm });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SAVE_START" });

    try {
      await createTovConfig({
        name,
        formality,
        warmth,
        directness,
        humor,
        enthusiasm,
        custom_instructions: customInstructions || null,
      });
      onCreated();
    } catch (err) {
      dispatch({ type: "SAVE_ERROR", payload: err instanceof Error ? err.message : "Failed to create" });
    } finally {
      dispatch({ type: "SAVE_END" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="config-name">Name</Label>
        <Input
          id="config-name"
          value={name}
          onChange={(e) => dispatch({ type: "SET_NAME", payload: e.target.value })}
          placeholder="e.g. Formal Sales, Casual Outreach"
          required
        />
      </div>

      {TOV_AXES.map(({ key, label, low, high }) => {
        const value = state[key];
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
              onValueChange={([v]: number[]) => dispatch({ type: "SET_AXIS", key, value: v / 100 })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{low}</span>
              <span>{high}</span>
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <Label>Custom Instructions (optional)</Label>
        <Textarea
          value={customInstructions}
          onChange={(e) => dispatch({ type: "SET_CUSTOM_INSTRUCTIONS", payload: e.target.value })}
          placeholder="Any additional tone instructions..."
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Live Preview */}
      <Alert variant="info">
        <AlertDescription>
          <h4 className="mb-1 text-sm font-semibold">Tone Preview</h4>
          <p className="whitespace-pre-wrap text-xs leading-relaxed">{preview}</p>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Create Config"}
      </Button>
    </form>
  );
}
