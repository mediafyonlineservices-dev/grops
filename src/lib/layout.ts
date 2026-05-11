import dagre from "dagre";
import type { GraphNode, GraphEdge } from "@workspace/api-client-react";

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  ranksep?: number;
  nodesep?: number;
}

/**
 * Strict top-down causal layout using Dagre.
 *
 * Philosophy: the graph is a causal story. The reader's eye should travel
 * smoothly from top (Start) to bottom (Finish). We optimise for:
 *
 *  1. DEPTH over WIDTH — longest-path ranker maximises vertical layers.
 *  2. CROSSING MINIMISATION — Dagre's network-simplex phase reorders nodes
 *     within each rank to minimise edge crossings.
 *  3. CYCLE SAFETY — greedy acyclicer breaks any cycle produced by the AI
 *     before layout begins, so the top-down flow is never violated.
 *  4. GENEROUS SPACING — ranksep/nodesep large enough that bezier curves
 *     have room to arc without passing through other nodes.
 */
export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  opts: LayoutOptions = {},
): Map<string, PositionedNode> {
  const nodeWidth = opts.nodeWidth ?? 220;
  const nodeHeight = opts.nodeHeight ?? 68;
  const ranksep = opts.ranksep ?? 90;    // vertical gap between ranks — compact
  const nodesep = opts.nodesep ?? 60;    // horizontal gap between nodes in same rank

  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setGraph({
    rankdir: "TB",
    ranker: "longest-path",    // pushes start high, finish low — maximum depth
    acyclicer: "greedy",       // breaks cycles so layout stays strictly top-down
    nodesep,
    ranksep,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const idSet = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight });
  }

  // All edges now are cause-only — include all of them in ranking.
  // (Correlation edges no longer exist after the new synthesis prompt.)
  for (const e of edges) {
    if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
    if (e.from === e.to) continue; // skip self-loops
    g.setEdge(e.from, e.to);
  }

  // Enforce Start at absolute top, Finish at absolute bottom.
  for (const n of nodes) {
    const gn = g.node(n.id) as { rank?: string } | undefined;
    if (!gn) continue;
    if (n.kind === "start") gn.rank = "min";
    if (n.kind === "finish") gn.rank = "max";
  }

  dagre.layout(g);

  const positions = new Map<string, PositionedNode>();
  for (const n of nodes) {
    const dn = g.node(n.id);
    if (!dn) continue;
    positions.set(n.id, {
      id: n.id,
      x: dn.x - nodeWidth / 2,
      y: dn.y - nodeHeight / 2,
      width: nodeWidth,
      height: nodeHeight,
    });
  }
  return positions;
}
