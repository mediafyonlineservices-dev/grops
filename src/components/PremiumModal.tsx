import { useState } from "react";
import { useUser } from "@clerk/react";
import { useJoinWaitlist } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Sparkles, Crown, Check, Zap, FolderOpen, Network, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURES = [
  {
    icon: Zap,
    title: "High-Velocity Nerve Mapping",
    body: "Process up to 20 documents × 100 pages per month.",
  },
  {
    icon: FolderOpen,
    title: "Project-Based Scale",
    body: "5 concurrent Research Projects with unified neural graphs.",
  },
  {
    icon: Network,
    title: "Deep Graphing — Unlocked",
    body: "Break the 100-node ceiling. Map every nuance.",
  },
  {
    icon: Users,
    title: "Shared Workspace",
    body: "Invite collaborators. AI links all your graphs together.",
  },
];

export function PremiumModal({ open, onOpenChange }: Props) {
  const { user } = useUser();
  const [name, setName] = useState(user?.fullName ?? user?.firstName ?? "");
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress ?? "");
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [done, setDone] = useState(false);

  const join = useJoinWaitlist();

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    join.mutate(
      { data: { name: name.trim(), email: email.trim() } },
      {
        onSuccess: (res) => {
          setDone(true);
          if (res.status === "already_on_waitlist") {
            toast.message("You are already on the waitlist.");
          } else {
            toast.success("Added to the Premium waitlist.");
          }
        },
        onError: (e: unknown) => {
          const err = e as { data?: { error?: string }; message?: string };
          toast.error("Could not join waitlist", { description: err.data?.error ?? err.message });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDone(false); onOpenChange(o); }}>
      <DialogContent
        className="max-w-md max-h-[85vh] overflow-y-auto border-primary/40"
        style={{ boxShadow: "0 0 0 1px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.2)" }}
        data-testid="premium-modal"
      >
        <DialogHeader className="pb-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/50 bg-primary/15 text-primary">
                <Crown className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                Grops Premium
              </span>
            </div>
            {/* Billing toggle */}
            <div className="flex overflow-hidden rounded-md border border-border/60 bg-card/60">
              {(["monthly", "yearly"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    billing === b ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {b === "monthly" ? "Monthly" : (
                    <span className="flex items-center gap-1">
                      Yearly
                      <span className="rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-400">−17%</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {billing === "monthly" ? (
              <>€14.99 <span className="text-sm font-normal text-muted-foreground">/ month</span></>
            ) : (
              <>€149 <span className="text-sm font-normal text-muted-foreground">/ year</span></>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Coming soon — join the waitlist and we'll notify you the moment it goes live.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              <Check className="h-5 w-5" />
            </span>
            <p className="text-center text-sm text-foreground">
              Thanks {name.split(" ")[0] || "there"} — you're on the list.
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid="button-close-premium">
              Close
            </Button>
          </div>
        ) : (
          <>
            <ul className="my-1 flex flex-col gap-2.5">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary">
                    <Icon className="h-3 w-3" />
                  </span>
                  <div>
                    <span className="text-xs font-medium text-foreground">{title}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{body}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="grid gap-2.5">
              <div className="grid gap-1">
                <Label htmlFor="wl-name" className="text-xs">Name</Label>
                <Input
                  id="wl-name"
                  data-testid="input-waitlist-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="wl-email" className="text-xs">Email</Label>
                <Input
                  id="wl-email"
                  type="email"
                  data-testid="input-waitlist-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@example.com"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                onClick={submit}
                disabled={join.isPending}
                data-testid="button-join-waitlist"
                className="w-full gap-2"
                size="sm"
              >
                <Crown className="h-3.5 w-3.5" />
                {join.isPending ? "Submitting…" : "Join the Premium waitlist"}
              </Button>
            </div>
            <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="mr-1 inline h-3 w-3" />
              No payment required to join the waitlist
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
