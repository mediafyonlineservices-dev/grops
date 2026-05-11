import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (adminIds.length === 0) {
    // Fail closed: refuse access until an admin allow-list is explicitly configured.
    res.status(503).json({
      error: "Admin allow-list not configured. Set ADMIN_USER_IDS env var.",
    });
    return;
  }
  if (!adminIds.includes(userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.userId = userId;
  next();
}
