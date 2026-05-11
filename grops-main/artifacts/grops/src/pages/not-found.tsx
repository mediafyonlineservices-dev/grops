import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-96 w-96 rounded-full bg-[#22D3EE]/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5 rounded-lg border border-border/60 bg-card/70 px-10 py-10 backdrop-blur-md">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10"
          style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
        >
          <AlertTriangle className="h-5 w-5 text-primary" />
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Error · 404
          </div>
          <div className="mt-1 font-sans text-2xl font-semibold text-foreground">
            Signal Lost
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            The requested route is not registered with the synthesis engine.
          </div>
        </div>
        <Link
          href="/"
          className="rounded-md border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-primary transition-colors hover:bg-primary/20"
          data-testid="link-home"
        >
          Return to console
        </Link>
      </div>
    </div>
  );
}
