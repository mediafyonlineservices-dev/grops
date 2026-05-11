import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { db, graphsTable, type GraphRow } from "@workspace/db";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { extractDocument, MAX_DOCS_PER_GRAPH, MAX_PAGES_PER_DOC } from "../lib/extract";
import {
  synthesizeGraph,
  clarifyGraph,
  expandGraph,
  type FinalNode,
  type FinalEdge,
  type TopicLegend,
  type GraphMode,
} from "../lib/synthesize";

const router: IRouter = Router();

const MAX_GRAPHS_PER_MONTH = 3;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: MAX_DOCS_PER_GRAPH },
});

interface SourceMeta {
  id: string;
  name: string;
  pages: number;
  charCount: number;
}

// In-memory IP rate limiter for the guest endpoint (1 synthesis per IP per 24h)
const guestRateLimit = new Map<string, number>(); // ip → timestamp of last generation

function rowToGraph(row: GraphRow) {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode as GraphMode,
    sources: row.sources as SourceMeta[],
    createdAt: row.createdAt.toISOString(),
    nodes: row.nodes as FinalNode[],
    edges: row.edges as FinalEdge[],
    topics: row.topics as TopicLegend[],
    generationMs: row.generationMs,
  };
}

function startOfMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function countGraphsThisMonth(userId: string): Promise<number> {
  const since = startOfMonthUTC();
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(graphsTable)
    .where(
      and(
        eq(graphsTable.userId, userId),
        gte(graphsTable.createdAt, since),
        eq(graphsTable.success, 1),
      ),
    );
  return Number(rows[0]?.c ?? 0);
}

// ─── List & usage ──────────────────────────────────────────────────────────────

router.get("/graphs", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(graphsTable)
      .where(eq(graphsTable.userId, req.userId!))
      .orderBy(desc(graphsTable.createdAt))
      .limit(50);
    res.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        mode: r.mode,
        createdAt: r.createdAt.toISOString(),
        nodeCount: Array.isArray(r.nodes) ? (r.nodes as unknown[]).length : 0,
        edgeCount: Array.isArray(r.edges) ? (r.edges as unknown[]).length : 0,
        sourceCount: Array.isArray(r.sources) ? (r.sources as unknown[]).length : 0,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/graphs/usage", requireAuth, async (req, res, next) => {
  try {
    const used = await countGraphsThisMonth(req.userId!);
    res.json({ used, limit: MAX_GRAPHS_PER_MONTH });
  } catch (err) {
    next(err);
  }
});

router.get("/graphs/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [row] = await db
      .select()
      .from(graphsTable)
      .where(and(eq(graphsTable.id, id), eq(graphsTable.userId, req.userId!)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Graph not found" });
      return;
    }
    res.json(rowToGraph(row));
  } catch (err) {
    next(err);
  }
});

// ─── Standard (authenticated) generation ──────────────────────────────────────

router.post(
  "/graphs",
  requireAuth,
  upload.array("files", MAX_DOCS_PER_GRAPH),
  async (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    try {
      const used = await countGraphsThisMonth(req.userId!);
      if (used >= MAX_GRAPHS_PER_MONTH) {
        res.status(429).json({
          error: `Monthly graph limit reached (${MAX_GRAPHS_PER_MONTH}/month). Resets at the start of next month.`,
        });
        return;
      }

      const mode = (String(req.body?.mode ?? "summary") as GraphMode) === "detailed"
        ? "detailed"
        : "summary";
      const userTitle = String(req.body?.title ?? "").trim() || undefined;

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        res.status(400).json({ error: "Upload at least one file under field 'files'." });
        return;
      }

      req.log.info({ count: files.length, names: files.map((f) => f.originalname) }, "Synthesizing graph");

      const docs = [] as Awaited<ReturnType<typeof extractDocument>>[];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const docId = `d${i + 1}`;
        const extracted = await extractDocument(f.buffer, f.originalname, docId);
        docs.push(extracted);
      }

      const sources: SourceMeta[] = docs.map((d) => ({
        id: d.id,
        name: d.name,
        pages: d.pages,
        charCount: d.charCount,
      }));

      const baseTitle = userTitle ?? files[0].originalname.replace(/\.[a-z0-9]+$/i, "") ?? "Neurograph";
      const result = await synthesizeGraph(docs, { userTitle: baseTitle, mode });
      const elapsed = Date.now() - startedAt;

      const [row] = await db
        .insert(graphsTable)
        .values({
          userId: req.userId!,
          title: result.title || baseTitle,
          mode,
          sources,
          nodes: result.nodes,
          edges: result.edges,
          topics: result.topics,
          generationMs: elapsed,
          success: 1,
        })
        .returning();

      res.json(rowToGraph(row));
    } catch (err) {
      next(err);
    }
  },
);

// ─── Guest generation (no auth, IP rate-limited to 1 per 24 h) ────────────────

router.post(
  "/graphs/guest",
  upload.array("files", MAX_DOCS_PER_GRAPH),
  async (req: Request, res: Response, next: NextFunction) => {
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
    const lastMs = guestRateLimit.get(ip) ?? 0;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (Date.now() - lastMs < ONE_DAY_MS) {
      res.status(429).json({
        error: "Guest limit reached. Create a free account to generate up to 3 graphs per month.",
      });
      return;
    }

    const startedAt = Date.now();
    try {
      const mode = (String(req.body?.mode ?? "summary") as GraphMode) === "detailed"
        ? "detailed"
        : "summary";
      const userTitle = String(req.body?.title ?? "").trim() || undefined;

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        res.status(400).json({ error: "Upload at least one file under field 'files'." });
        return;
      }

      req.log.info({ ip, count: files.length }, "Synthesizing guest graph");

      const docs = [] as Awaited<ReturnType<typeof extractDocument>>[];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const docId = `d${i + 1}`;
        const extracted = await extractDocument(f.buffer, f.originalname, docId);
        docs.push(extracted);
      }

      const sources: SourceMeta[] = docs.map((d) => ({
        id: d.id,
        name: d.name,
        pages: d.pages,
        charCount: d.charCount,
      }));

      const baseTitle = userTitle ?? files[0].originalname.replace(/\.[a-z0-9]+$/i, "") ?? "Neurograph";
      const result = await synthesizeGraph(docs, { userTitle: baseTitle, mode });
      const elapsed = Date.now() - startedAt;

      // Mark this IP as used — DO NOT save to DB
      guestRateLimit.set(ip, Date.now());

      res.json({
        title: result.title || baseTitle,
        mode,
        sources,
        nodes: result.nodes,
        edges: result.edges,
        topics: result.topics,
        generationMs: elapsed,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Import / claim a guest graph after sign-up (requires auth) ───────────────

router.post("/graphs/import", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const used = await countGraphsThisMonth(req.userId!);
    if (used >= MAX_GRAPHS_PER_MONTH) {
      res.status(429).json({
        error: `Monthly graph limit reached (${MAX_GRAPHS_PER_MONTH}/month).`,
      });
      return;
    }

    const { title, mode, sources, nodes, edges, topics, generationMs } = req.body as {
      title?: string;
      mode?: string;
      sources?: SourceMeta[];
      nodes?: FinalNode[];
      edges?: FinalEdge[];
      topics?: TopicLegend[];
      generationMs?: number;
    };

    if (!nodes?.length) {
      res.status(400).json({ error: "Graph has no nodes." });
      return;
    }

    const resolvedMode: GraphMode = mode === "detailed" ? "detailed" : "summary";

    const [row] = await db
      .insert(graphsTable)
      .values({
        userId: req.userId!,
        title: String(title ?? "Neurograph").trim() || "Neurograph",
        mode: resolvedMode,
        sources: sources ?? [],
        nodes: nodes ?? [],
        edges: edges ?? [],
        topics: topics ?? [],
        generationMs: Number(generationMs ?? 0),
        success: 1,
      })
      .returning();

    res.json(rowToGraph(row));
  } catch (err) {
    next(err);
  }
});

// ─── Clarify, expand, apply ────────────────────────────────────────────────────

router.post("/graphs/:id/clarify", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const question = String(req.body?.question ?? "").trim();
    if (!question) {
      res.status(400).json({ error: "Provide a question." });
      return;
    }
    const [row] = await db
      .select()
      .from(graphsTable)
      .where(and(eq(graphsTable.id, id), eq(graphsTable.userId, req.userId!)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Graph not found" });
      return;
    }
    const result = await clarifyGraph(question, {
      title: row.title,
      nodes: row.nodes as FinalNode[],
      edges: row.edges as FinalEdge[],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/graphs/:id/expand", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const newInfo = String(req.body?.newInfo ?? "").trim();
    if (!newInfo) {
      res.status(400).json({ error: "Provide new information." });
      return;
    }
    const [row] = await db
      .select()
      .from(graphsTable)
      .where(and(eq(graphsTable.id, id), eq(graphsTable.userId, req.userId!)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Graph not found" });
      return;
    }
    const proposal = await expandGraph(newInfo, {
      title: row.title,
      nodes: row.nodes as FinalNode[],
      edges: row.edges as FinalEdge[],
      topics: row.topics as TopicLegend[],
    });
    res.json(proposal);
  } catch (err) {
    next(err);
  }
});

router.post("/graphs/:id/expand/apply", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const proposal = req.body as { newNodes?: FinalNode[]; newEdges?: FinalEdge[] };
    const [row] = await db
      .select()
      .from(graphsTable)
      .where(and(eq(graphsTable.id, id), eq(graphsTable.userId, req.userId!)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Graph not found" });
      return;
    }
    const existingNodes = row.nodes as FinalNode[];
    const existingEdges = row.edges as FinalEdge[];
    const newNodes = (proposal.newNodes ?? []).filter(
      (n) => !existingNodes.some((e) => e.id === n.id),
    );
    const allNodes = [...existingNodes, ...newNodes];
    const idSet = new Set(allNodes.map((n) => n.id));
    const newEdges = (proposal.newEdges ?? []).filter(
      (e) => idSet.has(e.from) && idSet.has(e.to) && e.from !== e.to,
    );
    const allEdges = [...existingEdges, ...newEdges];

    const [updated] = await db
      .update(graphsTable)
      .set({ nodes: allNodes, edges: allEdges })
      .where(and(eq(graphsTable.id, id), eq(graphsTable.userId, req.userId!)))
      .returning();

    res.json(rowToGraph(updated));
  } catch (err) {
    next(err);
  }
});

router.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal error";
  req.log.error({ err }, "Graph route error");
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: message });
});

export default router;

void MAX_PAGES_PER_DOC;
