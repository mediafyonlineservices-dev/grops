import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { ArrowLeft, Layers, UserPlus, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { customFetch } from "@workspace/api-client-react";
import type { Neurograph, GraphNode } from "@workspace/api-client-react";
import { MapGraph } from "@/components/graph/MapGraph";
import { ContextPanel } from "@/components/graph/ContextPanel";
import { TopicLegend } from "@/components/graph/TopicLegend";
import { Button } from "@/components/ui/button";

export const GUEST_GRAPH_KEY = "grops_guest_graph";

export function GuestGraphView() {
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [claiming, setClaiming] = useState(false);

  const graph = useMemo<Omit<Neurograph, "id" | "createdAt"> | null>(() => {
    try {
      const raw = localStorage.getItem(GUEST_GRAPH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // If nothing in localStorage, bounce to home
  useEffect(() => {
    if (!graph) navigate("/app");
  }, [graph, navigate]);

  // Auto-claim when the user signs in while viewing this page
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !graph) return;
    (async () => {
      setClaiming(true);
      try {
        const saved = await customFetch<Neurograph>("/api/graphs/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(graph),
        });
        localStorage.removeItem(GUEST_GRAPH_KEY);
        toast.success("Graph saved to your account", {
          description: `"${saved.title}" is now in your history.`,
        });
        navigate(`/graphs/${saved.id}`);
      } catch (err: unknown) {
        const e = err as { data?: { error?: string }; message?: string };
        toast.error("Could not save graph", {
          description: e.data?.error ?? e.message ?? "Unknown error",
        });
        setClaiming(false);
      }
    })();
  }, [isLoaded, isSignedIn, graph, navigate]);

  if (!graph) return null;

  const sidebarOpen = !!selected;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/app">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <Layers className="mr-1 inline h-3 w-3" />
                {graph.mode} · {graph.sources.length} doc{graph.sources.length === 1 ? "" : "s"} ·{" "}
                {(graph.generationMs / 1000).toFixed(1)}s ·{" "}
                <span className="text-amber-400">guest preview</span>
              </span>
              <span className="mt-0.5 truncate font-sans text-base font-semibold text-foreground">
                {graph.title}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:flex">
            <span className="text-foreground">{graph.nodes.length}</span> nodes
            <span className="text-muted-foreground/40">·</span>
            <span className="text-foreground">{graph.edges.length}</span> edges
          </div>
        </div>
      </header>

      {/* Save-graph banner */}
      <div className="absolute inset-x-0 top-[56px] z-20 border-b border-amber-400/30 bg-amber-400/8 px-4 py-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">
            Guest graph · not saved · create a free account to keep it
          </p>
          <div className="flex items-center gap-2">
            {claiming ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </span>
            ) : (
              <>
                <Link href="/sign-up">
                  <Button size="sm" className="h-7 gap-1.5 text-xs">
                    <UserPlus className="h-3.5 w-3.5" />
                    Create account
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 border-amber-400/40 text-xs text-amber-400 hover:bg-amber-400/10">
                    <LogIn className="h-3.5 w-3.5" />
                    Sign in
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        className="pointer-events-none absolute left-4 z-10 flex justify-start"
        style={{ top: 120, right: sidebarOpen ? "calc(380px + 1rem)" : "1rem" }}
      >
        <div className="pointer-events-auto">
          <TopicLegend topics={graph.topics} sources={graph.sources} />
        </div>
      </div>

      {/* Graph canvas */}
      <div
        className="absolute inset-0 pb-0 transition-[right] duration-200"
        style={{ top: 120, right: sidebarOpen ? 380 : 0 }}
      >
        <MapGraph
          nodes={graph.nodes}
          edges={graph.edges}
          onSelectNode={setSelected}
          selectedId={selected?.id ?? null}
        />
      </div>

      {/* Node context panel (read-only for guests) */}
      <ContextPanel
        open={sidebarOpen}
        selected={selected}
        clarifyResult={null}
        proposal={null}
        onClose={() => setSelected(null)}
        onApproveProposal={() => {}}
        onRejectProposal={() => {}}
        applying={false}
        sources={graph.sources}
      />
    </div>
  );
}
