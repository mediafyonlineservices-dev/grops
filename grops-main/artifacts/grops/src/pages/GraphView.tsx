import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetGraph,
  getGetGraphQueryKey,
  useClarifyGraph,
  useExpandGraph,
  useApplyExpansion,
  type Neurograph,
  type GraphNode,
  type GraphEdge,
  type ClarifyResult,
  type ExpansionProposal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Layers } from "lucide-react";
import { toast } from "sonner";
import { MapGraph } from "@/components/graph/MapGraph";
import { ContextPanel } from "@/components/graph/ContextPanel";
import { PromptBar } from "@/components/graph/PromptBar";
import { TopicLegend } from "@/components/graph/TopicLegend";
import { Button } from "@/components/ui/button";

export function GraphView() {
  const params = useParams<{ id: string }>();
  const id = params.id!;
  const qc = useQueryClient();

  const q = useGetGraph(id, { query: { enabled: !!id, queryKey: getGetGraphQueryKey(id) } }) as {
    data: Neurograph | undefined;
    isLoading: boolean;
  };
  const graph = q.data;

  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [clarifyResult, setClarifyResult] = useState<ClarifyResult | null>(null);
  const [proposal, setProposal] = useState<ExpansionProposal | null>(null);
  const [intent, setIntent] = useState<"clarify" | "expand">("clarify");

  const clarify = useClarifyGraph();
  const expand = useExpandGraph();
  const apply = useApplyExpansion();

  // Highlighted nodes: all nodes that are part of the clarify answer
  const highlightedNodeIds = useMemo(() => {
    if (clarifyResult?.highlightedNodeIds.length) {
      return new Set(clarifyResult.highlightedNodeIds);
    }
    if (proposal?.newNodes.length) {
      return new Set(proposal.newNodes.map((n) => n.id));
    }
    return new Set<string>();
  }, [clarifyResult, proposal]);

  // Highlighted edges: edges where BOTH endpoints are highlighted nodes
  const highlightedEdgeKeys = useMemo(() => {
    if (!clarifyResult?.highlightedNodeIds.length || !graph) return new Set<string>();
    const nodeSet = new Set(clarifyResult.highlightedNodeIds);
    return new Set(
      graph.edges
        .filter((e) => nodeSet.has(e.from) && nodeSet.has(e.to))
        .map((e) => `${e.from}->${e.to}`),
    );
  }, [clarifyResult, graph]);

  // Proposal edge keys for bright-dotted preview styling
  const proposalEdgeKeys = useMemo(() => {
    if (!proposal) return new Set<string>();
    return new Set(proposal.newEdges.map((e: GraphEdge) => `${e.from}->${e.to}`));
  }, [proposal]);

  const previewNodes = useMemo<GraphNode[]>(() => {
    if (!graph) return [];
    if (proposal?.newNodes.length) return [...graph.nodes, ...proposal.newNodes];
    return graph.nodes;
  }, [graph, proposal]);

  const previewEdges = useMemo(() => {
    if (!graph) return [];
    if (proposal?.newEdges.length) return [...graph.edges, ...proposal.newEdges];
    return graph.edges;
  }, [graph, proposal]);

  const submit = (text: string) => {
    if (!graph) return;
    setClarifyResult(null);
    if (intent === "clarify") {
      clarify.mutate(
        { id: graph.id, data: { question: text } },
        {
          onSuccess: (r) => {
            setClarifyResult(r);
            setProposal(null);
          },
          onError: (e: unknown) => {
            const err = e as { data?: { error?: string }; message?: string };
            toast.error("Clarify failed", { description: err.data?.error ?? err.message });
          },
        },
      );
    } else {
      expand.mutate(
        { id: graph.id, data: { newInfo: text } },
        {
          onSuccess: (r) => {
            setProposal(r);
            setClarifyResult(null);
          },
          onError: (e: unknown) => {
            const err = e as { data?: { error?: string }; message?: string };
            toast.error("Expand failed", { description: err.data?.error ?? err.message });
          },
        },
      );
    }
  };

  const approveProposal = () => {
    if (!graph || !proposal) return;
    apply.mutate(
      {
        id: graph.id,
        data: { rationale: proposal.rationale, newNodes: proposal.newNodes, newEdges: proposal.newEdges },
      },
      {
        onSuccess: () => {
          toast.success(`Added ${proposal.newNodes.length} node(s) to the graph.`);
          setProposal(null);
          qc.invalidateQueries();
        },
        onError: (e: unknown) => {
          const err = e as { data?: { error?: string }; message?: string };
          toast.error("Apply failed", { description: err.data?.error ?? err.message });
        },
      },
    );
  };

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Loading neurograph…
      </div>
    );
  }
  if (!graph) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Graph not found
        </div>
        <Link
          href="/app"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
          data-testid="link-back"
        >
          ← Return to dashboard
        </Link>
      </div>
    );
  }

  const sidebarOpen = !!selected || !!clarifyResult || !!proposal;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/app" data-testid="link-back-home">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <Layers className="mr-1 inline h-3 w-3" />
                detailed · {graph.sources.length} doc{graph.sources.length === 1 ? "" : "s"} ·{" "}
                {graph.sources.reduce((s, x) => s + x.pages, 0)} pages · {(graph.generationMs / 1000).toFixed(1)}s
              </span>
              <span className="mt-0.5 truncate font-sans text-base font-semibold text-foreground" data-testid="graph-title">
                {graph.title}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:flex">
            <span className="text-foreground">{graph.nodes.length}</span>
            <span>nodes</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-foreground">{graph.edges.length}</span>
            <span>edges</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-foreground">{graph.topics.length}</span>
            <span>topics</span>
          </div>
        </div>
      </header>

      <div className="pointer-events-none absolute left-4 right-[calc(var(--sidebar-w,0px)+1rem)] top-[68px] z-10 flex justify-start"
           style={{ ["--sidebar-w" as string]: sidebarOpen ? "380px" : "0px" } as React.CSSProperties}>
        <div className="pointer-events-auto">
          <TopicLegend topics={graph.topics} sources={graph.sources} />
        </div>
      </div>

      <div
        className="absolute inset-0 pt-[68px] pb-[88px] transition-[right] duration-200"
        style={{ right: sidebarOpen ? 380 : 0 }}
      >
        <MapGraph
          nodes={previewNodes}
          edges={previewEdges}
          onSelectNode={setSelected}
          selectedId={selected?.id ?? null}
          highlightedNodeIds={highlightedNodeIds}
          highlightedEdgeKeys={highlightedEdgeKeys}
          proposalEdgeKeys={proposalEdgeKeys}
        />
      </div>

      <ContextPanel
        open={sidebarOpen}
        selected={selected}
        clarifyResult={clarifyResult}
        proposal={proposal}
        onClose={() => {
          setSelected(null);
          setClarifyResult(null);
          setProposal(null);
        }}
        onApproveProposal={approveProposal}
        onRejectProposal={() => setProposal(null)}
        applying={apply.isPending}
        sources={graph.sources}
      />

      <PromptBar
        intent={intent}
        onIntentChange={setIntent}
        onSubmit={submit}
        busy={clarify.isPending || expand.isPending}
      />
    </div>
  );
}
