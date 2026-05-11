import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import type {
  GraphNode,
  GraphSourceMeta,
  ClarifyResult,
  ExpansionProposal,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Props {
  open: boolean;
  selected: GraphNode | null;
  clarifyResult: ClarifyResult | null;
  proposal: ExpansionProposal | null;
  onClose: () => void;
  onApproveProposal: () => void;
  onRejectProposal: () => void;
  applying: boolean;
  sources: GraphSourceMeta[];
}

export function ContextPanel({
  open,
  selected,
  clarifyResult,
  proposal,
  onClose,
  onApproveProposal,
  onRejectProposal,
  applying,
  sources,
}: Props) {
  const sourceName = (id?: string | null) => {
    if (!id) return null;
    if (id === "shared") return "Multiple sources";
    if (id === "expansion") return "Expansion";
    return sources.find((s) => s.id === id)?.name ?? id;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="context"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="absolute right-0 top-[68px] bottom-[88px] z-30 flex w-[380px] flex-col overflow-hidden border-l border-border/60 bg-card/95 backdrop-blur-xl"
          data-testid="context-panel"
          style={{
            boxShadow: selected
              ? `0 0 0 1px ${selected.color}22, -10px 0 30px rgba(0,0,0,0.4)`
              : "-10px 0 30px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {proposal ? "Expansion Proposal" : clarifyResult ? "Clarification" : "Node Inspector"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label="Close panel"
              data-testid="button-close-panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
            {selected && (
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
                    style={{
                      color: selected.color,
                      background: `${selected.color}1f`,
                      border: `1px solid ${selected.color}66`,
                    }}
                  >
                    {selected.topic}
                  </span>
                  {selected.kind && selected.kind !== "concept" && (
                    <span className="rounded-sm bg-foreground/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
                      {selected.kind}
                    </span>
                  )}
                  {selected.sourceDocId && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      ← {sourceName(selected.sourceDocId)}
                    </span>
                  )}
                </div>
                <h2
                  className="font-sans text-2xl font-semibold leading-tight tracking-tight text-foreground"
                  data-testid="inspector-label"
                >
                  {selected.label}
                </h2>
                <section className="flex flex-col gap-2">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {selected.summary || "No summary available."}
                  </p>
                </section>
                <section className="flex flex-col gap-2">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Verbatim Source
                  </h3>
                  <blockquote
                    className="rounded-r-md border-l-2 bg-background/40 px-4 py-3 font-serif text-sm italic leading-relaxed text-foreground/85"
                    style={{ borderColor: selected.color }}
                    data-testid="inspector-quote"
                  >
                    {selected.quote || "No source quote provided."}
                  </blockquote>
                </section>
              </section>
            )}

            {clarifyResult && (
              <>
                {selected && <Separator className="my-1" />}
                <section className="flex flex-col gap-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                    Answer (highlighted in graph)
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/90" data-testid="clarify-answer">
                    {clarifyResult.answer}
                  </p>
                  {clarifyResult.highlightedNodeIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {clarifyResult.highlightedNodeIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-sm border border-primary/50 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary"
                        >
                          #{id}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {proposal && (
              <>
                {(selected || clarifyResult) && <Separator className="my-1" />}
                <section className="flex flex-col gap-3" data-testid="proposal">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                    Proposed expansion
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/90">{proposal.rationale}</p>
                  <div className="flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                      {proposal.newNodes.length} new node{proposal.newNodes.length === 1 ? "" : "s"}
                    </span>
                    <ul className="flex flex-col gap-1">
                      {proposal.newNodes.map((n) => (
                        <li key={n.id} className="text-sm text-foreground">
                          <span className="font-mono text-[10px] text-emerald-400">#{n.id}</span>{" "}
                          {n.label} <span className="text-muted-foreground">({n.topic})</span>
                        </li>
                      ))}
                    </ul>
                    <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                      {proposal.newEdges.length} new edge{proposal.newEdges.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={onApproveProposal}
                      disabled={applying}
                      className="flex-1 gap-2"
                      data-testid="button-approve-expansion"
                    >
                      <Check className="h-4 w-4" />
                      {applying ? "Applying…" : "Approve & merge"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onRejectProposal}
                      disabled={applying}
                      data-testid="button-reject-expansion"
                    >
                      Discard
                    </Button>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Proposed nodes are previewed in the graph and highlighted.
                  </p>
                </section>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
