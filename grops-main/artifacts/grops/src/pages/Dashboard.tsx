import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/react";
import {
  useGetGraphUsage,
  useHealthCheck,
  getHealthCheckQueryKey,
  type UsageStatus,
  type HealthStatus,
  customFetch,
  type Neurograph,
  getListGraphsQueryKey,
  getGetGraphUsageQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/BrandHeader";
import { MultiUploadZone } from "@/components/MultiUploadZone";
import { HistoryList } from "@/components/HistoryList";
import { PremiumModal } from "@/components/PremiumModal";
import { Button } from "@/components/ui/button";
import { GUEST_GRAPH_KEY } from "@/pages/GuestGraphView";

const ADMIN_HINT_IDS = (import.meta.env.VITE_ADMIN_USER_IDS as string | undefined)?.split(",") ?? [];

function HealthDot() {
  const q = useHealthCheck({ query: { refetchInterval: 30_000, queryKey: getHealthCheckQueryKey() } }) as {
    data: HealthStatus | undefined;
    isError: boolean;
  };
  const ok = !q.isError && !!q.data;
  const color = ok ? "#34D399" : "#EF4444";
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span>{ok ? "Synth-Link Online" : "Synth-Link Offline"}</span>
    </div>
  );
}

export function Dashboard() {
  const [premiumOpen, setPremiumOpen] = useState(false);
  const { user } = useUser();
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const usageQ = useGetGraphUsage({ query: { enabled: !!isSignedIn } }) as { data: UsageStatus | undefined };
  const usedFromApi = usageQ.data?.used ?? 0;
  const limitFromApi = usageQ.data?.limit ?? 3;

  const isGuest = isLoaded && !isSignedIn;
  const guestGraphExists = isGuest && !!localStorage.getItem(GUEST_GRAPH_KEY);

  // For guest: 0 or 1 used depending on whether they've generated
  const used = isGuest ? (guestGraphExists ? 1 : 0) : usedFromApi;
  const limit = isGuest ? 1 : limitFromApi;

  const isAdmin = user ? ADMIN_HINT_IDS.includes(user.id) : false;

  // After sign-up/sign-in: auto-claim any guest graph sitting in localStorage
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const raw = localStorage.getItem(GUEST_GRAPH_KEY);
    if (!raw) return;

    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { localStorage.removeItem(GUEST_GRAPH_KEY); return; }

    (async () => {
      try {
        const saved = await customFetch<Neurograph>("/api/graphs/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
        localStorage.removeItem(GUEST_GRAPH_KEY);
        qc.invalidateQueries({ queryKey: getListGraphsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetGraphUsageQueryKey() });
        toast.success("Graph saved to your account", {
          description: `"${saved.title}" is now in your history.`,
        });
        navigate(`/graphs/${saved.id}`);
      } catch {
        // Silent — they'll still see the graph in GuestGraphView if needed
        localStorage.removeItem(GUEST_GRAPH_KEY);
      }
    })();
  }, [isLoaded, isSignedIn, navigate, qc]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-32 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-96 h-[520px] w-[520px] rounded-full bg-[#22D3EE]/10 blur-3xl" />

      <BrandHeader
        showAdminLink={isAdmin}
        rightSlot={
          <>
            <HealthDot />
            {isSignedIn ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPremiumOpen(true)}
                data-testid="button-open-premium"
                className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Crown className="h-3.5 w-3.5" />
                Premium
              </Button>
            ) : null}
          </>
        }
      />

      <main className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
        <section className="flex flex-col gap-3">
          <h1 className="max-w-3xl font-sans text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
            {isGuest ? (
              <>
                Try Grops free —{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, #c026d3, #06b6d4, #a3e635)" }}
                >
                  no signup needed.
                </span>
              </>
            ) : (
              <>
                Synthesize up to 3 PDFs into one navigable{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, #c026d3, #06b6d4, #a3e635)" }}
                >
                  neurograph
                </span>
                .
              </>
            )}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {isGuest
              ? "Generate one graph as a guest. Create a free account to save it and get 3 graphs every month."
              : <>Choose <span className="text-foreground">Summary</span> for a 12-30 node overview, or{" "}
                  <span className="text-foreground">Detailed</span> for up to 100 nodes. Every concept is tagged
                  with its source document; every edge is a causal arrow.</>
            }
          </p>
        </section>

        <MultiUploadZone
          used={used}
          limit={limit}
          isGuest={isGuest}
          guestGraphExists={guestGraphExists}
          onLimitReached={() => setPremiumOpen(true)}
        />

        {isSignedIn && <HistoryList />}

        {isGuest && guestGraphExists && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
            <p className="text-sm text-amber-400">
              You have a guest graph saved locally.{" "}
              <button
                className="underline hover:text-amber-300"
                onClick={() => navigate("/graphs/guest")}
              >
                View it
              </button>
              {" "}or{" "}
              <a href="/sign-up" className="underline hover:text-amber-300">create an account</a>
              {" "}to save it permanently.
            </p>
          </div>
        )}

        <footer className="mt-8 flex items-center justify-between border-t border-border/40 pt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span>Grops · V1</span>
        </footer>
      </main>

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </div>
  );
}
