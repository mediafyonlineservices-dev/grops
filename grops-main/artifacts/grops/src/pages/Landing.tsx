import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, Network, GitBranch, Layers, ArrowRight } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Landing() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-32 top-32 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-96 h-[520px] w-[520px] rounded-full bg-[#22D3EE]/10 blur-3xl" />

      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/50 bg-primary/10 font-mono text-xs font-bold tracking-widest text-primary"
              style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.4)" }}
            >
              G
            </div>
            <span className="font-mono text-sm font-semibold uppercase tracking-[0.25em] text-foreground">
              Grops
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" data-testid="button-sign-in">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" data-testid="button-sign-up">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
        <section className="flex flex-col gap-6">
          <h1 className="max-w-3xl font-sans text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            Your documents,{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #c026d3, #06b6d4, #a3e635)" }}
            >
              thinking together.
            </span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Grops reads your documents — research papers, reports, notes — and maps every concept,
            cause, and connection into a living neural graph you can explore, question, and grow.
            Stop skimming. Start understanding.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-sign-up">
                <Sparkles className="h-4 w-4" />
                Start mapping — free
              </Button>
            </Link>
            <Link href="/app">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 w-full sm:w-auto border-border/60 text-muted-foreground hover:text-foreground"
                data-testid="button-cta-try-guest"
              >
                Try without signing up
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto" data-testid="button-cta-sign-in">
                I already have an account
              </Button>
            </Link>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground/70">
            3 neural graphs free every month. No credit card required.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Deep multi-source synthesis",
              body: "Upload up to 3 documents at once. Grops merges every source into a single unified neural graph — with full attribution on every node.",
            },
            {
              icon: GitBranch,
              title: "Causation vs. correlation",
              body: "Not all connections are equal. Grops draws a clear line between what drives what and what merely travels together.",
            },
            {
              icon: Network,
              title: "A graph you can talk to",
              body: "Ask any question. The answer lights up exactly the nodes and connections that explain it — right inside the graph.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-sans text-lg font-medium text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <footer className="flex items-center justify-between border-t border-border/40 pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span>Grops · Synthesis Engine V1</span>
          <span>{basePath || "/"}</span>
        </footer>
      </main>
    </div>
  );
}
