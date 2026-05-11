# Grops V1 — PDF → Neurograph Synthesis

Turns up to 3 PDFs into a navigable, hierarchical map of concepts that distinguishes causation from correlation, with per-user history and a Premium waitlist.

## Run & Operate
- Dev: workflows `artifacts/api-server: API Server` and `artifacts/grops: web` (auto-managed).
- Codegen: `pnpm --filter @workspace/api-spec run codegen` after editing `lib/api-spec/openapi.yaml`.
- Typecheck: `pnpm --filter @workspace/grops run typecheck`, `pnpm --filter @workspace/api-server run typecheck`.
- DB push: `pnpm --filter @workspace/db run push`.
- Required env (server): `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `ADMIN_USER_IDS` (comma-separated Clerk user IDs).
- Required env (web): `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`, `VITE_ADMIN_USER_IDS` (UI hint only — server enforces).

## Stack
- React 18 + Vite 7 + Tailwind v4 + React Flow + dagre + Clerk react SDK.
- Express + Clerk express SDK + multer + pdf-parse + Zod + Drizzle (Postgres) + pino.
- OpenAI (model `gpt-5.4` via integrations proxy) for synthesis / clarify / expand.
- pnpm monorepo with project references; orval-generated React Query client.

## Where things live
- DB schema: `lib/db/src/schema/{graphs,waitlist,index}.ts` (source of truth).
- API contract: `lib/api-spec/openapi.yaml` → generates `lib/api-client-react/src/generated/`.
- API impl: `artifacts/api-server/src/{app.ts, routes/, lib/{extract,synthesize}.ts, middlewares/requireAuth.ts}`.
- Web app: `artifacts/grops/src/{App.tsx, pages/{Landing,Dashboard,GraphView,AdminPage}.tsx, components/, lib/{layout,queryClient}.ts}`.
- Theme: `artifacts/grops/src/index.css` (`@layer theme,base,clerk,components,utilities`).

## Architecture decisions
- Auth via Clerk with `proxyUrl` (server proxy at `/__clerk`) so the browser never leaves the artifact origin.
- Hierarchical layout uses dagre `rankdir:TB`; only causation edges constrain rank, correlation edges are rendered but symmetric (dashed, double arrows).
- Start nodes are pinned to `rank:"min"`, Finish to `rank:"max"`.
- Each node carries `sourceDocId` (`d1`/`d2`/`d3`/`shared`/`expansion`) — rendered as a colored badge.
- Monthly limit (3 graphs / user) enforced server-side via `count(graphs)` with `userId + createdAt >= startOfMonth`.
- Failed generations are persisted with `success=0` for admin health stats.
- Admin route is gated by `ADMIN_USER_IDS` env (server) — UI just hides the link via `VITE_ADMIN_USER_IDS`.
- 30s synthesis budget via `Promise.race(synthesize, timeout)`.

## Product
- Landing → Sign-in / Sign-up (Clerk).
- Dashboard: multi-PDF upload (≤3 docs × 50 pages), Summary (≤30 nodes) vs Detailed (≤100), per-user history, monthly usage indicator, Premium modal.
- Graph view: canvas + right Context panel (Inspector / Clarify answer / Expansion proposal) + bottom prompt bar with Clarify ↔ Expand intents.
- Admin: per-user activity, waitlist, generation success rate.
- Premium: €14.99/mo waitlist (name + email).

## Gotchas
- Always run `pnpm -r --filter @workspace/api-client-react exec tsc` (or rely on TS project refs) after editing `lib/api-client-react/src/index.ts` — stale `dist/index.d.ts` causes "no exported member" errors in consumers.
- After OpenAPI edits, run codegen before typechecking grops.
- Vite optimized-deps cache invalidates on `vite.config.ts` change; if HMR shows phantom file errors after deletes, restart the workflow.

## Pointers
- Skills: `clerk-auth`, `react-vite`, `pnpm-workspace`, `database`, `deployment`.
- Clerk theme: `@clerk/themes` `shadcn` with `cssLayerName:"clerk"`.
