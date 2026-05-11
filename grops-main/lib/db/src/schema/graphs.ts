import { pgTable, text, integer, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const graphsTable = pgTable(
  "graphs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    mode: text("mode").notNull(),
    sources: jsonb("sources").notNull(),
    nodes: jsonb("nodes").notNull(),
    edges: jsonb("edges").notNull(),
    topics: jsonb("topics").notNull(),
    generationMs: integer("generation_ms").notNull().default(0),
    success: integer("success").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("graphs_user_id_idx").on(t.userId), index("graphs_created_at_idx").on(t.createdAt)],
);

export const insertGraphSchema = createInsertSchema(graphsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGraph = z.infer<typeof insertGraphSchema>;
export type GraphRow = typeof graphsTable.$inferSelect;
