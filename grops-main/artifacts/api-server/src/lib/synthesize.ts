import { openai } from "@workspace/integrations-openai-ai-server";
import { NEON_PALETTE, FALLBACK_COLOR } from "./colors";
import type { ExtractedDoc } from "./extract";

export type GraphMode = "summary" | "detailed";
export type EdgeKind = "cause" | "correlation";
export type NodeKind = "start" | "finish" | "concept";

export interface RawNode {
  id: string;
  label: string;
  topic: string;
  summary: string;
  quote: string;
  sourceDocId?: string | null;
  kind?: NodeKind;
}

export interface RawEdge {
  from: string;
  to: string;
  label: string;
  kind?: EdgeKind;
}

export interface RawGraph {
  title?: string;
  nodes: RawNode[];
  edges: RawEdge[];
}

export interface FinalNode extends RawNode {
  color: string;
  sourceDocId: string | null;
  kind: NodeKind;
}

export interface FinalEdge {
  from: string;
  to: string;
  label: string;
  color: string;
  kind: EdgeKind;
}

export interface TopicLegend {
  topic: string;
  color: string;
  count: number;
}

export interface SynthResult {
  title: string;
  nodes: FinalNode[];
  edges: FinalEdge[];
  topics: TopicLegend[];
}

interface SynthOptions {
  userTitle?: string;
  mode: GraphMode;
}

function buildSystemPrompt(mode: GraphMode, docCount: number): string {
  const nodeBudget =
    mode === "summary"
      ? "Produce 12-22 nodes total. Prefer 14-18. Every node must earn its place — no padding."
      : "Produce 28-55 nodes total. Prefer 35-45. Capture nuanced intermediate causes without redundancy.";

  const depthHint =
    mode === "summary"
      ? "Aim for 5-8 vertical levels of causation."
      : "Aim for 8-14 vertical levels of causation.";

  return `You are GROPS, a causal synthesis engine. You read ${docCount} source document(s) and produce a CAUSAL LOGIC MAP: a strict top-down Directed Acyclic Graph (DAG) that traces, step by step, WHY and HOW a topic unfolds from a single root cause to its final conclusions.

Think of the output as a CAUSAL STORY. A reader starts at the top (Start), follows the arrows down, and at each step understands: "this happened BECAUSE of what came before it." By the time they reach the bottom (Finish nodes), they should deeply understand why the conclusions were inevitable.

═══ OUTPUT FORMAT ═══
Output ONLY valid JSON — no prose, no markdown fences:
{
  "title": "<4-8 word causal summary, e.g. 'How Oil Dependency Reshapes Global Power'>",
  "nodes": [
    {
      "id": "1",
      "label": "<2-5 word noun phrase>",
      "topic": "<broad domain: Economy | Politics | Technology | Science | Society | History | Law | Culture | Environment | Finance>",
      "summary": "<one sentence: what this concept IS and its role in the causal chain>",
      "quote": "<short verbatim extract from source text supporting this node>",
      "sourceDocId": "<d1 | d2 | d3 | shared>",
      "kind": "start" | "concept" | "finish"
    }
  ],
  "edges": [
    {
      "from": "<node id>",
      "to": "<node id>",
      "label": "<1-3 word active verb: triggers | drives | forces | reduces | enables | produces | accelerates | destabilises>",
      "kind": "cause"
    }
  ]
}

═══ STRUCTURAL RULES (NON-NEGOTIABLE) ═══

1. SINGLE START NODE
   Exactly one node with kind="start" — the root cause, initial condition, or triggering event. It sits alone at the top of the graph with only outgoing edges.

2. FINISH NODES (2-5)
   Nodes with kind="finish" — the final outcomes, conclusions, or consequences. They sit at the bottom with only incoming edges. They represent what a reader should understand after tracing the full chain.

3. ALL OTHER NODES = "concept"
   Intermediate causes that form the causal backbone.

4. ONLY CAUSE EDGES — kind must always be "cause". NEVER use "correlation". Every single edge represents a direct, logical "A causes B" relationship.

5. STRICT DAG — No cycles. No path from any node leads back to itself or to an ancestor.

6. FULL CONNECTIVITY — Every node is reachable from the start node. Every concept node leads toward a finish node. No isolated sub-graphs, no orphan nodes.

7. ${depthHint} Prefer depth over width. Each vertical level (rank) should have at most 4 nodes. A chain of 6 sequential steps is far better than 10 parallel nodes on one level.

═══ MULTI-DOCUMENT SYNTHESIS ═══
When ${docCount > 1 ? `${docCount} documents are provided` : "a document is provided"}, DO NOT create parallel sub-graphs for each document. Instead, find the causal bridges that connect concepts ACROSS documents. A mechanism described in document 1 may directly cause an outcome discussed in document 2 — show that connection. The reader should not be able to tell which document contributed which node — it should read as one unified analysis.

═══ EDGE QUALITY ═══
- Use short, punchy active verb phrases: "triggers", "drives", "forces", "reduces", "enables", "destabilises", "amplifies", "fractures"
- Each edge must represent a step a thoughtful analyst would defend with evidence
- Prefer fewer, stronger edges. No redundant edges between the same pair of nodes.
- A node with 4+ outgoing edges is a red flag — split it into a more granular chain.

═══ NODE QUALITY ═══
- label: 2-5 words, noun phrase, specific and descriptive
- summary: one sentence explaining what this concept means in the context of the causal chain
- quote: a short verbatim extract from the actual source text (never invented)
- sourceDocId: which document this node primarily comes from (d1, d2, d3, or "shared" if synthesised across multiple)
- topic: choose from the fixed list above. Reuse the same topic name for related nodes — it drives the colour legend.

${nodeBudget}
Node ids are sequential strings: "1", "2", "3", ...
Return ONLY the JSON object. No code fences, no commentary, no explanation.`;
}

function safeParse(raw: string): RawGraph {
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) text = text.slice(first, last + 1);
  return JSON.parse(text) as RawGraph;
}

async function callLLM(docs: ExtractedDoc[], opts: SynthOptions): Promise<RawGraph> {
  const userPreamble = opts.userTitle ? `User-provided title: "${opts.userTitle}".\n\n` : "";
  const docBlocks = docs
    .map(
      (d, i) =>
        `--- DOCUMENT ${i + 1} (id="${d.id}", name="${d.name}", pages=${d.pages}) ---\n${d.text}`,
    )
    .join("\n\n");

  const userText =
    userPreamble +
    `Mode: ${opts.mode.toUpperCase()}\n\n${docBlocks}\n\n--- END SOURCES ---`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: opts.mode === "detailed" ? 8000 : 4000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(opts.mode, docs.length) },
      { role: "user", content: userText },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return safeParse(raw);
}

function normalizeTopic(t: string): string {
  return t.trim().replace(/\s+/g, " ").replace(/^(.)/, (c) => c.toUpperCase());
}

interface ConsolidatedAssignments {
  remap: Map<string, string>;
  finalTopics: string[];
}

function consolidateTopics(rawTopics: Map<string, number>, maxTopics = 6): ConsolidatedAssignments {
  const sorted = [...rawTopics.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length <= maxTopics) {
    const remap = new Map<string, string>();
    sorted.forEach(([t]) => remap.set(t, t));
    return { remap, finalTopics: sorted.map(([t]) => t) };
  }
  const keep = sorted.slice(0, maxTopics - 1).map(([t]) => t);
  const merged = sorted.slice(maxTopics - 1).map(([t]) => t);
  const remap = new Map<string, string>();
  for (const t of keep) remap.set(t, t);
  for (const t of merged) remap.set(t, "Other");
  return { remap, finalTopics: [...keep, "Other"] };
}

function assignColors(finalTopics: string[]): Map<string, string> {
  const map = new Map<string, string>();
  finalTopics.forEach((topic, i) => {
    const color = NEON_PALETTE[i % NEON_PALETTE.length]?.hex ?? FALLBACK_COLOR;
    map.set(topic, color);
  });
  return map;
}

function clampNodeCount<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  return arr.slice(0, max);
}

export async function synthesizeGraph(
  docs: ExtractedDoc[],
  opts: SynthOptions,
): Promise<SynthResult> {
  if (docs.length === 0) throw new Error("No source documents provided.");

  const raw = await callLLM(docs, opts);

  if (!raw || !Array.isArray(raw.nodes) || raw.nodes.length === 0) {
    throw new Error("The synthesizer returned an empty graph.");
  }

  const docIds = new Set(docs.map((d) => d.id));
  const maxNodes = opts.mode === "summary" ? 30 : 100;

  let normalizedNodes: RawNode[] = raw.nodes.map((n, i) => {
    const sid = n.sourceDocId == null ? null : String(n.sourceDocId);
    const sourceDocId = sid && (docIds.has(sid) || sid === "shared") ? sid : docs[0]?.id ?? null;
    const kind: NodeKind =
      n.kind === "start" || n.kind === "finish" ? n.kind : "concept";
    return {
      id: String(n.id ?? i + 1),
      label: String(n.label ?? `Concept ${i + 1}`).trim(),
      topic: normalizeTopic(String(n.topic ?? "Other")),
      summary: String(n.summary ?? "").trim(),
      quote: String(n.quote ?? "").trim(),
      sourceDocId,
      kind,
    };
  });

  normalizedNodes = clampNodeCount(normalizedNodes, maxNodes);

  // Ensure exactly one start and at least one finish
  const starts = normalizedNodes.filter((n) => n.kind === "start");
  const finishes = normalizedNodes.filter((n) => n.kind === "finish");
  if (starts.length === 0 && normalizedNodes.length > 0) {
    normalizedNodes[0].kind = "start";
  } else if (starts.length > 1) {
    normalizedNodes.forEach((n, i) => {
      if (n.kind === "start" && i > 0 && n !== starts[0]) n.kind = "concept";
    });
  }
  if (finishes.length === 0 && normalizedNodes.length > 1) {
    normalizedNodes[normalizedNodes.length - 1].kind = "finish";
  }

  const tally = new Map<string, number>();
  for (const n of normalizedNodes) tally.set(n.topic, (tally.get(n.topic) ?? 0) + 1);

  const { remap, finalTopics } = consolidateTopics(tally, 6);
  const colorByTopic = assignColors(finalTopics);

  const idSet = new Set(normalizedNodes.map((n) => n.id));

  const finalNodes: FinalNode[] = normalizedNodes.map((n) => {
    const finalTopic = remap.get(n.topic) ?? "Other";
    const color = colorByTopic.get(finalTopic) ?? FALLBACK_COLOR;
    return {
      ...n,
      topic: finalTopic,
      color,
      sourceDocId: n.sourceDocId ?? null,
      kind: n.kind ?? "concept",
    };
  });

  const nodeColorById = new Map(finalNodes.map((n) => [n.id, n.color]));
  const startId = finalNodes.find((n) => n.kind === "start")?.id;
  const finishIds = new Set(finalNodes.filter((n) => n.kind === "finish").map((n) => n.id));

  // Deduplicate and enforce all edges are cause-only, no self-loops,
  // no edges INTO the start node, no edges OUT OF finish nodes.
  const seenEdgePairs = new Set<string>();
  const finalEdges: FinalEdge[] = (raw.edges ?? [])
    .filter((e) => {
      if (!e) return false;
      const from = String(e.from);
      const to = String(e.to);
      if (!idSet.has(from) || !idSet.has(to)) return false;
      if (from === to) return false;                   // no self-loops
      if (to === startId) return false;                // start has no incoming
      if (finishIds.has(from)) return false;           // finish has no outgoing
      const pair = `${from}→${to}`;
      if (seenEdgePairs.has(pair)) return false;       // no duplicate edges
      seenEdgePairs.add(pair);
      return true;
    })
    .map((e) => ({
      from: String(e.from),
      to: String(e.to),
      label: String(e.label ?? "leads to").trim() || "leads to",
      color: nodeColorById.get(String(e.from)) ?? FALLBACK_COLOR,
      kind: "cause" as EdgeKind,                       // force all edges to cause
    }));

  // Remove orphan nodes: keep only nodes reachable from the start node
  // (breadth-first from start, following outgoing edges).
  const reachable = new Set<string>();
  if (startId) {
    const adj = new Map<string, string[]>();
    for (const e of finalEdges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e.to);
    }
    const queue = [startId];
    while (queue.length) {
      const cur = queue.shift()!;
      if (reachable.has(cur)) continue;
      reachable.add(cur);
      for (const nxt of (adj.get(cur) ?? [])) queue.push(nxt);
    }
  } else {
    // No start node — keep all (fallback)
    finalNodes.forEach((n) => reachable.add(n.id));
  }

  const connectedNodes = finalNodes.filter((n) => reachable.has(n.id));
  const connectedIds = new Set(connectedNodes.map((n) => n.id));
  const connectedEdges = finalEdges.filter((e) => connectedIds.has(e.from) && connectedIds.has(e.to));

  const legendCounts = new Map<string, number>();
  for (const n of connectedNodes) legendCounts.set(n.topic, (legendCounts.get(n.topic) ?? 0) + 1);
  const topics: TopicLegend[] = finalTopics.map((t) => ({
    topic: t,
    color: colorByTopic.get(t) ?? FALLBACK_COLOR,
    count: legendCounts.get(t) ?? 0,
  }));

  const title = (raw.title && String(raw.title).trim()) || opts.userTitle || "Neural Map";

  return { title, nodes: connectedNodes, edges: connectedEdges, topics };
}

// ---------- Clarification (intent B): answer a question about an existing graph ----------
export interface ClarifyResult {
  answer: string;
  highlightedNodeIds: string[];
}

export async function clarifyGraph(
  question: string,
  graph: { title: string; nodes: FinalNode[]; edges: FinalEdge[] },
): Promise<ClarifyResult> {
  const nodeList = graph.nodes
    .map((n) => `[${n.id}] ${n.label} (${n.topic}) — ${n.summary}`)
    .join("\n");
  const edgeList = graph.edges
    .map((e) => `${e.from} -[${e.kind}: ${e.label}]-> ${e.to}`)
    .join("\n");

  const sys = `You are GROPS, a neural-graph oracle. You answer questions about an existing knowledge graph. Return ONLY valid JSON of the form:
{
  "answer": "<concise paragraph or two answering the user question, grounded in the graph>",
  "highlightedNodeIds": ["<id>", "<id>", ...]
}
Highlight the specific node ids that are most relevant to the user's question. Keep highlight count to 1-6.`;

  const usr = `GRAPH TITLE: ${graph.title}

NODES:
${nodeList}

EDGES (kind: cause = directional, correlation = symmetric):
${edgeList}

QUESTION: ${question}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = safeParse(raw) as unknown as ClarifyResult;
  const validIds = new Set(graph.nodes.map((n) => n.id));
  const ids = Array.isArray(parsed.highlightedNodeIds)
    ? parsed.highlightedNodeIds.map(String).filter((id) => validIds.has(id))
    : [];
  return {
    answer: String(parsed.answer ?? "").trim() || "I couldn't find a clear answer in this graph.",
    highlightedNodeIds: ids.slice(0, 6),
  };
}

// ---------- Expansion (intent A): propose new nodes/edges from new info ----------
export interface ExpansionProposal {
  rationale: string;
  newNodes: FinalNode[];
  newEdges: FinalEdge[];
}

export async function expandGraph(
  newInfo: string,
  graph: { title: string; nodes: FinalNode[]; edges: FinalEdge[]; topics: TopicLegend[] },
): Promise<ExpansionProposal> {
  const nodeList = graph.nodes.map((n) => `[${n.id}] ${n.label} (${n.topic})`).join("\n");
  const existingMaxId = graph.nodes.reduce((m, n) => Math.max(m, parseInt(n.id, 10) || 0), 0);

  const sys = `You are GROPS, expanding an existing knowledge graph with NEW information.
Return ONLY valid JSON of the form:
{
  "rationale": "<2-3 sentences explaining what you propose to add and why>",
  "newNodes": [
    { "id": "<unique new id, integer string starting from ${existingMaxId + 1}>",
      "label": "<2-6 words>", "topic": "<existing or new topic>",
      "summary": "<one sentence>", "quote": "<near-verbatim from new info>",
      "sourceDocId": "expansion", "kind": "concept" }
  ],
  "newEdges": [
    { "from": "<id (existing or new)>", "to": "<id>",
      "label": "<short verb>", "kind": "cause" | "correlation" }
  ]
}
Propose 2-6 new nodes and the edges connecting them to existing nodes (cite existing ids).`;

  const usr = `GRAPH TITLE: ${graph.title}

EXISTING NODES:
${nodeList}

NEW INFORMATION:
${newInfo}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = safeParse(raw) as unknown as {
    rationale?: string;
    newNodes?: RawNode[];
    newEdges?: RawEdge[];
  };

  const topicColor = new Map(graph.topics.map((t) => [t.topic, t.color]));
  const fallback = NEON_PALETTE[graph.topics.length % NEON_PALETTE.length]?.hex ?? FALLBACK_COLOR;
  const existingIds = new Set(graph.nodes.map((n) => n.id));

  const newNodes: FinalNode[] = (parsed.newNodes ?? []).map((n, i) => {
    const id = String(n.id ?? existingMaxId + 1 + i);
    const topic = normalizeTopic(String(n.topic ?? "Other"));
    const color = topicColor.get(topic) ?? fallback;
    return {
      id,
      label: String(n.label ?? `New ${i + 1}`),
      topic,
      summary: String(n.summary ?? "").trim(),
      quote: String(n.quote ?? "").trim(),
      sourceDocId: "expansion",
      kind: "concept",
      color,
    };
  });

  const allIds = new Set([...existingIds, ...newNodes.map((n) => n.id)]);
  const colorById = new Map<string, string>();
  for (const n of graph.nodes) colorById.set(n.id, n.color);
  for (const n of newNodes) colorById.set(n.id, n.color);

  const newEdges: FinalEdge[] = (parsed.newEdges ?? [])
    .filter((e) => e && allIds.has(String(e.from)) && allIds.has(String(e.to)) && String(e.from) !== String(e.to))
    .map((e) => {
      const kind: EdgeKind = e.kind === "correlation" ? "correlation" : "cause";
      return {
        from: String(e.from),
        to: String(e.to),
        label: String(e.label ?? (kind === "cause" ? "causes" : "linked to")).trim() ||
          (kind === "cause" ? "causes" : "linked to"),
        color: colorById.get(String(e.from)) ?? fallback,
        kind,
      };
    });

  return {
    rationale: String(parsed.rationale ?? "").trim() || "Proposed expansion based on the provided information.",
    newNodes,
    newEdges,
  };
}
