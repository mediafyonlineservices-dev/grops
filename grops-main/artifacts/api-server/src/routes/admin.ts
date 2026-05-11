import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, graphsTable, waitlistTable } from "@workspace/db";
import { desc, sql, gte, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

function startOfMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

router.get("/admin/users", requireAdmin, async (_req, res, next) => {
  try {
    const since = startOfMonthUTC();
    const rows = await db
      .select({
        userId: graphsTable.userId,
        graphCount: sql<number>`count(*)::int`,
        lastActivity: sql<Date>`max(${graphsTable.createdAt})`,
      })
      .from(graphsTable)
      .where(gte(graphsTable.createdAt, since))
      .groupBy(graphsTable.userId);

    const totals = await db
      .select({
        userId: graphsTable.userId,
        totalGraphs: sql<number>`count(*)::int`,
      })
      .from(graphsTable)
      .groupBy(graphsTable.userId);

    const totalsMap = new Map(totals.map((t) => [t.userId, Number(t.totalGraphs)]));

    res.json({
      monthStart: since.toISOString(),
      users: rows.map((r) => ({
        userId: r.userId,
        graphsThisMonth: Number(r.graphCount),
        totalGraphs: totalsMap.get(r.userId) ?? 0,
        lastActivity: r.lastActivity instanceof Date ? r.lastActivity.toISOString() : new Date(r.lastActivity).toISOString(),
        limit: 3,
      })),
      totalUsers: totals.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/waitlist", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(waitlistTable)
      .orderBy(desc(waitlistTable.createdAt));
    res.json({
      total: rows.length,
      entries: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/health", requireAdmin, async (_req, res, next) => {
  try {
    const since = startOfMonthUTC();
    const rows = await db
      .select({
        success: graphsTable.success,
        generationMs: graphsTable.generationMs,
      })
      .from(graphsTable)
      .where(and(gte(graphsTable.createdAt, since)));
    const total = rows.length;
    const successes = rows.filter((r) => r.success === 1).length;
    const failures = total - successes;
    const successRate = total > 0 ? Math.round((successes / total) * 1000) / 10 : 0;
    const successfulRows = rows.filter((r) => r.success === 1);
    const avgMs =
      successfulRows.length > 0
        ? Math.round(
            successfulRows.reduce((s, r) => s + (r.generationMs ?? 0), 0) /
              successfulRows.length,
          )
        : 0;
    res.json({ total, successes, failures, successRate, avgMs });
  } catch (err) {
    next(err);
  }
});

router.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal error";
  req.log.error({ err }, "Admin route error");
  res.status(500).json({ error: message });
});

export default router;
