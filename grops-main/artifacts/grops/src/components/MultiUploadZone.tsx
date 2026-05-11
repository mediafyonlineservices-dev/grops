import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, FileText, X, Sparkles, Lock, AlignLeft } from "lucide-react";
import {
  getListGraphsQueryKey,
  getGetGraphUsageQueryKey,
  type Neurograph,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { customFetch } from "@workspace/api-client-react";
import { GuestSignUpModal } from "@/components/GuestSignUpModal";
import { GUEST_GRAPH_KEY } from "@/pages/GuestGraphView";

const MAX_DOCS = 3;

interface Props {
  used: number;
  limit: number;
  isGuest?: boolean;
  guestGraphExists?: boolean;
  onLimitReached: () => void;
}

type InputTab = "files" | "text";

export function MultiUploadZone({ used, limit, isGuest, guestGraphExists, onLimitReached }: Props) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<InputTab>("files");
  const [files, setFiles] = useState<File[]>([]);
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState<"summary" | "detailed">("summary");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);

  const atLimit = used >= limit;

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of arr) {
        if (merged.length >= MAX_DOCS) break;
        if (!merged.find((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      if (merged.length === MAX_DOCS && arr.length + prev.length > MAX_DOCS) {
        toast.message(`Limit is ${MAX_DOCS} documents per graph.`);
      }
      return merged;
    });
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = tab === "files" ? files.length > 0 : rawText.trim().length > 0;

  const submit = useCallback(async () => {
    // Guest has already used their free graph → show sign-up modal
    if (isGuest && guestGraphExists) {
      setSignUpOpen(true);
      return;
    }
    // Authenticated user hit their monthly limit → open premium
    if (!isGuest && atLimit) {
      onLimitReached();
      return;
    }
    if (!canSubmit) {
      toast.error(tab === "files" ? "Add at least one document." : "Paste some text first.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("mode", mode);
      if (tab === "files") {
        for (const f of files) form.append("files", f);
      } else {
        const blob = new Blob([rawText.trim()], { type: "text/plain" });
        form.append("files", blob, "pasted-text.txt");
      }

      if (isGuest) {
        // Guest path — no auth, result not saved to DB
        const result = await customFetch<Omit<Neurograph, "id" | "createdAt">>("/api/graphs/guest", {
          method: "POST",
          body: form,
        });
        localStorage.setItem(GUEST_GRAPH_KEY, JSON.stringify(result));
        toast.success("Graph ready", {
          description: `"${result.title}" — create a free account to save it permanently.`,
        });
        navigate("/graphs/guest");
      } else {
        // Authenticated path — saved to DB as usual
        const result = await customFetch<Neurograph>("/api/graphs", {
          method: "POST",
          body: form,
        });
        qc.invalidateQueries({ queryKey: getListGraphsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetGraphUsageQueryKey() });
        toast.success("Synthesis complete", {
          description: `"${result.title}" — ${result.nodes.length} nodes, ${result.edges.length} edges`,
        });
        navigate(`/graphs/${result.id}`);
      }
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { error?: string }; message?: string };
      if (e.status === 429) {
        if (isGuest) {
          setSignUpOpen(true);
        } else {
          onLimitReached();
          toast.error("Monthly graph limit reached.");
        }
      } else {
        toast.error("Synthesis failed", {
          description: e.data?.error ?? e.message ?? "Unknown error",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [isGuest, guestGraphExists, atLimit, canSubmit, tab, files, rawText, mode, navigate, onLimitReached, qc]);

  const effectivelyLocked = isGuest ? guestGraphExists : atLimit;

  return (
    <div className="relative flex flex-col gap-4">
      {/* Tab switcher */}
      <div className="flex overflow-hidden rounded-lg border border-border/60 bg-card/60 w-fit">
        {([["files", <Upload key="u" className="h-3 w-3" />, "Upload Files"], ["text", <AlignLeft key="a" className="h-3 w-3" />, "Paste Text"]] as const).map(([t, icon, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            data-testid={`button-tab-${t}`}
            className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {tab === "files" ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (effectivelyLocked) {
                isGuest ? setSignUpOpen(true) : onLimitReached();
                return;
              }
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => {
              if (effectivelyLocked) {
                isGuest ? setSignUpOpen(true) : onLimitReached();
                return;
              }
              inputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            data-testid="upload-zone"
            className={`group relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed transition-all ${
              effectivelyLocked
                ? "cursor-not-allowed border-border/40 bg-card/20 opacity-60"
                : dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/70 bg-card/30 hover:border-primary/60 hover:bg-card/50"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.35)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-primary/15 blur-3xl" />
            <input
              ref={inputRef}
              type="file"
              accept="*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
              data-testid="input-file"
            />
            <div className="relative flex flex-col items-center gap-2">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10"
                style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.35)" }}
              >
                {effectivelyLocked ? <Lock className="h-5 w-5 text-primary" /> : <Upload className="h-5 w-5 text-primary" />}
              </div>
              <div className="text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {effectivelyLocked
                    ? isGuest ? "Guest limit reached" : "Monthly limit reached"
                    : "Drop or select up to 3 documents"}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {effectivelyLocked
                    ? isGuest
                      ? "Create a free account to get 3 graphs/month"
                      : "Upgrade to Premium for more graphs"
                    : "PDF, DOCX, TXT, MD, CSV and more · max 50 pages each"}
                </div>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <ul className="flex flex-col gap-2" data-testid="file-list">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-card/50 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate text-sm text-foreground">{f.name}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} kb
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove file"
                    data-testid={`button-remove-file-${i}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="relative">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste your text here — articles, notes, research, transcripts… Grops will synthesize a neural graph from it."
            data-testid="input-raw-text"
            rows={10}
            className="w-full resize-y rounded-xl border border-border/70 bg-card/30 px-4 py-3 font-sans text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-colors focus:border-primary/60 focus:bg-card/50"
          />
          {rawText.length > 0 && (
            <div className="absolute bottom-3 right-3 font-mono text-[10px] text-muted-foreground/60">
              {rawText.length.toLocaleString()} chars
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Graph Type
          </span>
          <div role="tablist" className="flex overflow-hidden rounded-md border border-border/60 bg-card/60">
            {(["summary", "detailed"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                data-testid={`button-mode-${m}`}
                className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  mode === m
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}{" "}
                <span className="ml-1 text-muted-foreground/70">
                  {m === "summary" ? "≤ 30 nodes" : "≤ 100 nodes"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {isGuest ? `${used}/1 guest` : `${used}/${limit} this month`}
          </span>
          <Button
            onClick={submit}
            disabled={submitting || !canSubmit}
            data-testid="button-synthesize"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {submitting ? "Synthesizing…" : "Synthesize"}
          </Button>
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {tab === "files" ? `Up to ${MAX_DOCS} documents · 50 pages each` : "Raw text is treated as a single document"}
      </p>

      {submitting && <ProcessingOverlay mode={mode} />}

      <GuestSignUpModal open={signUpOpen} onOpenChange={setSignUpOpen} />
    </div>
  );
}

function ProcessingOverlay({ mode }: { mode: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-testid="processing-overlay"
    >
      <div className="flex flex-col items-center gap-5 rounded-lg border border-primary/40 bg-card/90 px-10 py-8 shadow-2xl">
        <div className="relative h-12 w-12">
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.4)" }}
          />
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            Synthesizing · {mode}
          </div>
          <div className="mt-1 font-mono text-sm uppercase tracking-widest text-foreground">
            Neural Topology
          </div>
          <div className="mt-2 max-w-xs font-mono text-[10px] text-muted-foreground">
            Parsing documents · classifying topics · resolving causation
          </div>
        </div>
      </div>
    </div>
  );
}
