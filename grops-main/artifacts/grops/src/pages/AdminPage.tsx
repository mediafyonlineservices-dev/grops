import { useState } from "react";
import { useUser } from "@clerk/react";
import {
  useAdminListUsers,
  useAdminListWaitlist,
  useAdminSystemHealth,
  type AdminUsersResponse,
  type AdminWaitlistResponse,
  type AdminHealthResponse,
} from "@workspace/api-client-react";
import { Activity, Mail, Users, AlertTriangle, Copy, Check, ShieldCheck } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {hint && <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  return `${new Date(iso).toISOString().slice(0, 10)} ${new Date(iso).toTimeString().slice(0, 5)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy} aria-label="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function AdminBootstrap({ userId }: { userId: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10">
        <ShieldCheck className="h-10 w-10 text-primary" />
        <div className="flex max-w-md flex-col gap-4 text-center">
          <h2 className="font-sans text-xl font-semibold text-foreground">Admin access not configured</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            To unlock the admin dashboard, add your Clerk user ID to the{" "}
            <code className="rounded bg-card px-1 py-0.5 font-mono text-xs text-primary">ADMIN_USER_IDS</code>{" "}
            environment variable. Share this ID with your developer or paste it yourself in the Replit Secrets panel.
          </p>
          <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/50 px-3 py-2">
            <code className="truncate font-mono text-xs text-foreground">{userId}</code>
            <CopyButton text={userId} />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Your Clerk user ID — copy it into ADMIN_USER_IDS
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { user } = useUser();
  const usersQ = useAdminListUsers() as { data: AdminUsersResponse | undefined; isError: boolean; error: unknown };
  const waitlistQ = useAdminListWaitlist() as { data: AdminWaitlistResponse | undefined };
  const healthQ = useAdminSystemHealth() as { data: AdminHealthResponse | undefined };

  const errStatus = (usersQ.error as { status?: number } | undefined)?.status;

  // Not configured yet — show bootstrap helper with user's ID
  if (usersQ.isError && errStatus === 503) {
    return <AdminBootstrap userId={user?.id ?? "loading…"} />;
  }

  // Configured but this user isn't on the list
  if (usersQ.isError && errStatus === 403) {
    return (
      <div className="flex min-h-screen flex-col">
        <BrandHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <h2 className="font-sans text-xl font-semibold text-foreground">Forbidden</h2>
          <p className="text-sm text-muted-foreground">Your account is not on the admin allow-list.</p>
          {user?.id && (
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-card/50 px-3 py-2">
              <span className="font-mono text-xs text-muted-foreground">Your ID:</span>
              <code className="font-mono text-xs text-foreground">{user.id}</code>
              <CopyButton text={user.id} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const users = usersQ.data?.users ?? [];
  const waitlist = waitlistQ.data?.entries ?? [];
  const health = healthQ.data;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <BrandHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Admin · Monitoring</span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">System overview</h1>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <StatCard icon={Users} label="Active users (this month)" value={users.length} />
          <StatCard icon={Mail} label="Premium waitlist" value={waitlist.length} />
          <StatCard
            icon={Activity}
            label="Generation success"
            value={health ? `${health.successRate}%` : "—"}
            hint={health ? `${health.successes}/${health.total} OK · avg ${(health.avgMs / 1000).toFixed(1)}s` : undefined}
          />
          <StatCard
            icon={AlertTriangle}
            label="Failures this month"
            value={health?.failures ?? 0}
          />
        </section>

        <section className="flex flex-col gap-3" data-testid="admin-users">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            User activity (current month)
          </h2>
          <div className="overflow-hidden rounded-md border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-card/60 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">User ID</th>
                  <th className="px-4 py-2 text-right">This month</th>
                  <th className="px-4 py-2 text-right">All time</th>
                  <th className="px-4 py-2 text-right">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No users yet this month.
                    </td>
                  </tr>
                )}
                {users.map((u) => {
                  const overLimit = u.graphsThisMonth >= u.limit;
                  return (
                    <tr key={u.userId} className="border-t border-border/40">
                      <td className="px-4 py-2 font-mono text-xs text-foreground">{u.userId}</td>
                      <td className={`px-4 py-2 text-right font-mono ${overLimit ? "text-amber-400" : "text-foreground"}`}>
                        {u.graphsThisMonth} / {u.limit}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">{u.totalGraphs}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                        {formatDate(u.lastActivity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3" data-testid="admin-waitlist">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Premium waitlist
          </h2>
          <div className="overflow-hidden rounded-md border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-card/60 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No waitlist signups yet.
                    </td>
                  </tr>
                )}
                {waitlist.map((w) => (
                  <tr key={w.id} className="border-t border-border/40">
                    <td className="px-4 py-2 text-foreground">{w.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{w.email}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                      {formatDate(w.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
