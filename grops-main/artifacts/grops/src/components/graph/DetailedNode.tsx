import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface DetailedData {
  label: string;
  topic: string;
  color: string;
  summary: string;
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

export function DetailedNode({ data }: NodeProps) {
  const d = data as unknown as DetailedData;
  const sourceColor = d.sourceDocId ? SOURCE_TONES[d.sourceDocId] ?? "#fff" : "#888";
  const isStart = d.kind === "start";
  const isFinish = d.kind === "finish";
  const isTerminal = isStart || isFinish;
  const ring = d.highlighted
    ? `0 0 0 2px #fff, 0 0 16px ${d.color}`
    : isTerminal
      ? `0 0 0 2px ${d.color}aa, 0 0 20px ${d.color}66`
      : `0 0 0 1px ${d.color}44, 0 0 10px ${d.color}33`;

  return (
    <div
      data-testid="node-detailed"
      className="relative flex w-[220px] flex-col rounded border bg-card/95 backdrop-blur-sm overflow-hidden"
      style={{ borderColor: isTerminal ? d.color : `${d.color}77`, boxShadow: ring }}
    >
      {isTerminal && (
        <div
          className="flex items-center gap-1 px-2 py-0.5"
          style={{ background: `${d.color}1e`, borderBottom: `1px solid ${d.color}44` }}
        >
          <span className="h-1 w-1 rounded-full flex-shrink-0" style={{ background: d.color }} />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: d.color }}>
            {isStart ? "Start" : "Finish"}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1 px-2.5 py-2">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className="rounded-sm px-1 py-px font-mono text-[9px] uppercase tracking-widest truncate"
            style={{ color: d.color, background: `${d.color}18`, border: `1px solid ${d.color}44` }}
          >
            {d.topic}
          </span>
          {d.sourceDocId && (
            <span
              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full font-mono text-[7px] font-bold"
              style={{ background: sourceColor, color: "#000" }}
              title={`Source: ${d.sourceDocId}`}
            >
              {d.sourceDocId === "shared" ? "★" : d.sourceDocId.replace(/^d/, "")}
            </span>
          )}
        </div>
        <div className="font-sans text-[13px] font-medium leading-snug text-foreground line-clamp-2">
          {d.label}
        </div>
      </div>

      <Handle type="target" position={Position.Top} style={{ background: d.color, opacity: 0.6, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: d.color, opacity: 0.6, width: 8, height: 8 }} />
    </div>
  );
}
