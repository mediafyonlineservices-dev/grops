import type { TopicLegendEntry, GraphSourceMeta } from "@workspace/api-client-react";

const SOURCE_TONES: Record<string, string> = {
  d1: "#c026d3",
  d2: "#06b6d4",
  d3: "#f59e0b",
  shared: "#ffffff",
};

interface Props {
  topics: TopicLegendEntry[];
  sources?: GraphSourceMeta[];
}

export function TopicLegend({ topics, sources = [] }: Props) {
  if (topics.length === 0) return null;
  return (
    <div className="flex max-w-[640px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-card/70 px-3 py-2 backdrop-blur-md">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Topology
        </span>
        <span className="text-muted-foreground/40">|</span>
        {topics.map((t) => (
          <div
            key={t.topic}
            data-testid={`legend-${t.topic}`}
            className="flex items-center gap-1.5 rounded-sm border border-border/40 bg-background/40 px-2 py-1"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: t.color, boxShadow: `0 0 6px ${t.color}` }}
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">
              {t.topic}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{t.count}</span>
          </div>
        ))}
      </div>
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-card/70 px-3 py-2 backdrop-blur-md">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Sources
          </span>
          <span className="text-muted-foreground/40">|</span>
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-1.5 rounded-sm border border-border/40 bg-background/40 px-2 py-1"
            >
              <span
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full font-mono text-[8px] font-bold"
                style={{ background: SOURCE_TONES[s.id] ?? "#fff", color: "#000" }}
              >
                {s.id.replace(/^d/, "")}
              </span>
              <span className="max-w-[140px] truncate font-mono text-[10px] text-foreground" title={s.name}>
                {s.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{s.pages}p</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
