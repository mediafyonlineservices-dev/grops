import { Link } from "wouter";
import { useListGraphs, type GraphSummary } from "@workspace/api-client-react";
import { ArrowUpRight, FileStack, Layers } from "lucide-react";

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} · ${d.toTimeString().slice(0, 5)}`;
}

export function HistoryList() {
  const q = useListGraphs() as { data: GraphSummary[] | undefined; isLoading: boolean };
  const list = q.data ?? [];

  return (
    <section className="flex flex-col gap-3" data-testid="history-list">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Your Synthesis History
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
          {list.length} graph{list.length === 1 ? "" : "s"}
        </span>
      </div>

      {q.isLoading && (
        <div className="rounded-md border border-border/40 bg-card/40 px-4 py-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Loading…
        </div>
      )}

      {!q.isLoading && list.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-card/30 px-4 py-12 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Awaiting First Synthesis
          </div>
          <div className="text-sm text-muted-foreground/80">
            Upload up to 3 PDFs above to register the first sample.
          </div>
        </div>
      )}

      {list.length > 0 && (
        <ul className="flex flex-col gap-2">
          {list.map((g) => (
            <li key={g.id}>
              <Link
                href={`/graphs/${g.id}`}
                data-testid={`link-graph-${g.id}`}
                className="group flex items-center justify-between gap-4 rounded-md border border-border/50 bg-card/50 px-4 py-3 transition-colors hover-elevate active-elevate"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/40 text-muted-foreground">
                    {g.mode === "detailed" ? <Layers className="h-3.5 w-3.5" /> : <FileStack className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{g.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span className="text-primary">{g.mode}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{g.sourceCount} doc{g.sourceCount === 1 ? "" : "s"}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{g.nodeCount} nodes</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{g.edgeCount} edges</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{formatTimestamp(g.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
