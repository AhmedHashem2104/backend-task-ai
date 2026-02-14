import { useEffect, useState } from "react";
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">TOV Configs</h1>
        </div>
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
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((config) => (
            <Card key={config.id}>
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

function CreateConfigForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [formality, setFormality] = useState(0.5);
  const [warmth, setWarmth] = useState(0.5);
  const [directness, setDirectness] = useState(0.5);
  const [humor, setHumor] = useState(0.3);
  const [enthusiasm, setEnthusiasm] = useState(0.5);
  const [customInstructions, setCustomInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = translateTovPreview({ formality, warmth, directness, humor, enthusiasm });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

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
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const axes = [
    { label: "Formality", value: formality, setter: setFormality, low: "Casual", high: "Formal" },
    { label: "Warmth", value: warmth, setter: setWarmth, low: "Cool", high: "Warm" },
    { label: "Directness", value: directness, setter: setDirectness, low: "Consultative", high: "Direct" },
    { label: "Humor", value: humor, setter: setHumor, low: "Serious", high: "Witty" },
    { label: "Enthusiasm", value: enthusiasm, setter: setEnthusiasm, low: "Measured", high: "Energetic" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="config-name">Name</Label>
        <Input
          id="config-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Formal Sales, Casual Outreach"
          required
        />
      </div>

      {axes.map(({ label, value, setter, low, high }) => (
        <div key={label} className="space-y-2">
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
            onValueChange={([v]: number[]) => setter(v / 100)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{low}</span>
            <span>{high}</span>
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <Label>Custom Instructions (optional)</Label>
        <Textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
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
