import { useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphNode, GraphEdge } from "@workspace/api-client-react";
import { layoutGraph } from "@/lib/layout";
import { DetailedNode } from "./DetailedNode";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (node: GraphNode | null) => void;
  selectedId: string | null;
  highlightedNodeIds?: Set<string>;
  highlightedEdgeKeys?: Set<string>;
  proposalEdgeKeys?: Set<string>;
}

const nodeTypes = {
  summary: DetailedNode,
  detailed: DetailedNode,
};

function AutoFit({ nodeCount }: { nodeCount: number }) {
  const flow = useReactFlow();
  const last = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - last.current < 250) return;
    last.current = now;
    const t = window.setTimeout(() => {
      flow.fitView({ padding: 0.18, duration: 400, maxZoom: 1.0, minZoom: 0.05 });
    }, 100);
    return () => window.clearTimeout(t);
  }, [nodeCount, flow]);
  return null;
}

/**
 * Assign curvature to each edge so parallel edges (from same source to
 * different targets, or the same pair duplicated) fan out and never overlap.
 *
 * - Same (from, to) pair: ± alternating arcs
 * - Multiple edges leaving the same source: gentle spread proportional to
 *   the edge's index within that source's fan-out
 */
function assignCurvatures(edges: GraphEdge[]): number[] {
  const pairGroups = new Map<string, number[]>();
  const sourceGroups = new Map<string, number[]>();

  edges.forEach((e, i) => {
    const pairKey = `${e.from}||${e.to}`;
    if (!pairGroups.has(pairKey)) pairGroups.set(pairKey, []);
    pairGroups.get(pairKey)!.push(i);

    if (!sourceGroups.has(e.from)) sourceGroups.set(e.from, []);
    sourceGroups.get(e.from)!.push(i);
  });

  const curvatures = new Array<number>(edges.length).fill(0.2);

  // Exact parallel edges (same pair): alternate arcs each side — tighter with compact layout
  pairGroups.forEach((indices) => {
    if (indices.length <= 1) return;
    indices.forEach((idx, pos) => {
      const sign = pos % 2 === 0 ? 1 : -1;
      const mag = 0.35 + Math.floor(pos / 2) * 0.2;
      curvatures[idx] = sign * mag;
    });
  });

  // Fan-out from same source to different targets: spread gently
  sourceGroups.forEach((indices) => {
    if (indices.length <= 1) return;
    const unique = indices.filter((i) => {
      const key = `${edges[i].from}||${edges[i].to}`;
      return (pairGroups.get(key)?.length ?? 1) === 1;
    });
    if (unique.length <= 1) return;
    const mid = (unique.length - 1) / 2;
    unique.forEach((idx, pos) => {
      curvatures[idx] = 0.2 + (pos - mid) * (0.2 / Math.max(unique.length - 1, 1));
    });
  });

  return curvatures;
}

function MapGraphInner({
  nodes,
  edges,
  onSelectNode,
  selectedId,
  highlightedNodeIds,
  highlightedEdgeKeys,
  proposalEdgeKeys,
}: Props) {
  const positions = useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);
  const curvatures = useMemo(() => assignCurvatures(edges), [edges]);

  const flowNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        return {
          id: n.id,
          type: "detailed",
          position: { x: pos.x, y: pos.y },
          data: {
            label: n.label,
            topic: n.topic,
            color: n.color,
            summary: n.summary,
            sourceDocId: n.sourceDocId ?? null,
            kind: n.kind,
            highlighted: highlightedNodeIds?.has(n.id) ?? false,
          },
          selected: selectedId === n.id,
          draggable: true,
        };
      }),
    [nodes, positions, selectedId, highlightedNodeIds],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((e, i) => {
        const edgeKey = `${e.from}->${e.to}`;
        const isHighlighted = highlightedEdgeKeys?.has(edgeKey) ?? false;
        const isProposal = proposalEdgeKeys?.has(edgeKey) ?? false;

        let stroke = e.color;
        let strokeWidth = 1.5;
        let strokeDasharray: string | undefined;
        let opacity = 0.85;
        let filter: string | undefined;

        if (isHighlighted) {
          strokeWidth = 3;
          opacity = 1;
          filter = `drop-shadow(0 0 6px ${e.color})`;
        }

        if (isProposal) {
          stroke = "#00ff88";
          strokeWidth = 2.5;
          strokeDasharray = "8 5";
          opacity = 1;
          filter = "drop-shadow(0 0 8px #00ff88)";
        }

        return {
          id: `e-${e.from}-${e.to}-${i}`,
          source: e.from,
          target: e.to,
          type: "default",
          pathOptions: { curvature: curvatures[i] },
          label: e.label,
          animated: !isProposal,
          style: { stroke, strokeWidth, strokeDasharray, opacity, filter },
          labelStyle: {
            fill: isProposal ? "#00ff88" : e.color,
            fontSize: 10,
            fontFamily: "var(--app-font-mono, monospace)",
            textTransform: "uppercase" as const,
            letterSpacing: 1,
          },
          labelBgStyle: { fill: "hsl(var(--background))", fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 2,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isProposal ? "#00ff88" : e.color,
            width: 14,
            height: 14,
          },
        };
      }),
    [edges, curvatures, highlightedEdgeKeys, proposalEdgeKeys],
  );

  const handleNodeClick: NodeMouseHandler = (_evt, node) => {
    const found = nodes.find((n) => n.id === node.id) ?? null;
    onSelectNode(found);
  };

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onPaneClick={() => onSelectNode(null)}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1.0, minZoom: 0.05 }}
      minZoom={0.04}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="bg-transparent"
    >
      <Background gap={40} size={1} color="hsl(var(--border) / 0.3)" />
      <Controls showInteractive={false} />
      <AutoFit nodeCount={nodes.length} />
    </ReactFlow>
  );
}

export function MapGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <MapGraphInner {...props} />
    </ReactFlowProvider>
  );
}
