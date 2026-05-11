import { useState } from "react";
import { Send, MessageSquare, GitBranchPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Intent = "clarify" | "expand";

interface Props {
  intent: Intent;
  onIntentChange: (i: Intent) => void;
  onSubmit: (text: string) => void;
  busy: boolean;
}

const PLACEHOLDERS: Record<Intent, string> = {
  clarify: "Ask a question about this graph — e.g. 'Why does X cause Y?' or 'Summarize the religion topic'",
  expand: "Add new information — Grops will propose new nodes/edges for your approval",
};

export function PromptBar({ intent, onIntentChange, onSubmit, busy }: Props) {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim() || busy) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-end gap-3 px-4 py-3">
        <div role="tablist" className="flex shrink-0 overflow-hidden rounded-md border border-border/60 bg-card/60" data-testid="intent-toggle">
          {([
            { key: "clarify" as const, icon: MessageSquare, label: "Clarify" },
            { key: "expand" as const, icon: GitBranchPlus, label: "Expand" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={intent === key}
              onClick={() => onIntentChange(key)}
              data-testid={`button-intent-${key}`}
              className={`flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                intent === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={PLACEHOLDERS[intent]}
          data-testid="input-prompt"
          className="min-h-[42px] max-h-[120px] resize-none font-sans text-sm"
        />
        <Button
          onClick={submit}
          disabled={busy || !text.trim()}
          data-testid="button-prompt-submit"
          className="shrink-0 gap-2"
        >
          <Send className="h-4 w-4" />
          {busy ? "Working…" : intent === "clarify" ? "Ask" : "Propose"}
        </Button>
      </div>
    </div>
  );
}
