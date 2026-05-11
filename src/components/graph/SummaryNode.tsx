import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { FlagTriangleRight } from "lucide-react";

interface SummaryData {
  label: string;
  topic: string;
  color: string;
  sourceDocId?: string | null;
  kind?: "start" | "finish" | "concept";
  highlighted?: boolean;
}

const SOURCE_TONES: Record<string, string> = {
  d1: "#c026d3",
  d2: "#06b6d4",
  d3: "#f59e0b",
  shared: "#ffffff",
  expansion: "#10b981",
};

export function SummaryNode({ data }: NodeProps) {
  const d = data as unknown as SummaryData;
  const sourceColor = d.sourceDocId ? SOURCE_TONES[d.sourceDocId] ?? "#fff" : "#888";
  const isStart = d.kind === "start";
  const isFinish = d.kind === "finish";
  const isTerminal = isStart || isFinish;
  const ringIntensity = d.highlighted
    ? "0 0 0 2px #fff, 0 0 24px " + d.color
    : isTerminal
      ? `0 0 0 2px ${d.color}99, 0 0 24px ${d.color}88`
      : `0 0 0 1px ${d.color}33, 0 0 16px ${d.color}55`;

  return (
    <div
      data-testid="node-summary"
      className="relative flex flex-col rounded-md border bg-card/95 backdrop-blur-sm overflow-hidden"
      style={{
        borderColor: isTerminal ? d.color : `${d.color}88`,
        boxShadow: ringIntensity,
        minWidth: 200,
        maxWidth: 240,
      }}
    >
      {/* Terminal label banner */}
      {isTerminal && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5"
          style={{ background: `${d.color}22`, borderBottom: `1px solid ${d.color}55` }}
        >
          <span
            className="h-1 w-1 rounded-full"
            style={{ background: d.color, boxShadow: `0 0 4px ${d.color}` }}
          />
          <span
            className="font-mono text-[9px] font-bold uppercase tracking-[0.25em]"
            style={{ color: d.color }}
          >
            {isStart ? "Start" : "Finish"}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }}
        />
        <span className="min-w-0 flex-1 truncate font-sans text-sm leading-tight text-foreground">
          {d.label}
        </span>
        {d.sourceDocId && (
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[8px] font-bold uppercase"
            style={{ background: sourceColor, color: "#000" }}
            title={`Source: ${d.sourceDocId}`}
          >
            {d.sourceDocId === "shared" ? <FlagTriangleRight className="h-2.5 w-2.5" /> : d.sourceDocId.replace(/^d/, "")}
          </span>
        )}
      </div>

      <Handle type="target" position={Position.Top} style={{ background: d.color, opacity: 0.5 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: d.color, opacity: 0.5 }} />
    </div>
  );
}
