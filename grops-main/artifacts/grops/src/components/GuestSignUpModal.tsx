import { Link } from "wouter";
import { Sparkles, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestSignUpModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-primary/30 bg-[#0b0d18]">
        <DialogHeader className="gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10"
            style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.35)" }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-lg font-semibold leading-snug text-foreground">
            Save your graph & unlock 2 more
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            You've used your one free guest graph. Create a free account to save it
            permanently and get <span className="text-foreground">3 graphs every month</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-2">
          <Link href="/sign-up" onClick={() => onOpenChange(false)}>
            <Button className="w-full gap-2">
              <UserPlus className="h-4 w-4" />
              Create free account
            </Button>
          </Link>
          <Link href="/sign-in" onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="w-full gap-2 border-border/60">
              <LogIn className="h-4 w-4" />
              Sign in to existing account
            </Button>
          </Link>
        </div>

        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
          No credit card · Free forever up to 3 graphs/month
        </p>
      </DialogContent>
    </Dialog>
  );
}
