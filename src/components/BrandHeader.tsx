import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck } from "lucide-react";

interface Props {
  showAdminLink?: boolean;
  rightSlot?: React.ReactNode;
}

export function BrandHeader({ showAdminLink, rightSlot }: Props) {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full items-center justify-between gap-4 px-6 py-3">
        <Link href="/app" data-testid="link-home">
          <div className="flex cursor-pointer items-center gap-3">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/50 bg-primary/10 font-mono text-xs font-bold tracking-widest text-primary"
              style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.4)" }}
            >
              G
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-mono text-sm font-semibold uppercase tracking-[0.25em] text-foreground">
                Grops
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {rightSlot}
          {showAdminLink && (
            <Link href="/admin" data-testid="link-admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </Button>
            </Link>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:inline">
                {user.primaryEmailAddress?.emailAddress ?? user.username ?? user.id.slice(0, 8)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                aria-label="Sign out"
                data-testid="button-sign-out"
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
