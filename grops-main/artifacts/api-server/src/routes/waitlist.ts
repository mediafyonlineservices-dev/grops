import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, waitlistTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/waitlist", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!name || name.length < 1) {
      res.status(400).json({ error: "Name is required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid email is required." });
      return;
    }

    const existing = await db.select().from(waitlistTable).where(eq(waitlistTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.json({ status: "already_on_waitlist" });
      return;
    }

    await db.insert(waitlistTable).values({ name, email });
    res.json({ status: "added" });
  } catch (err) {
    next(err);
  }
});

router.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal error";
  req.log.error({ err }, "Waitlist route error");
  res.status(500).json({ error: message });
});

export default router;
