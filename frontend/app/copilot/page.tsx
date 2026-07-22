"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles, Send, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { copilotApi, ApiError, type CopilotResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: CopilotResponse;
  error?: string;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    copilotApi.suggestions().then(setSuggestions).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(query: string) {
    if (!query.trim() || isSending) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: query };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const response = await copilotApi.query(query);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: response.answer, response },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "",
          error: err instanceof ApiError ? err.message : "Couldn't reach the Copilot service.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <EmptyState suggestions={suggestions} onSelect={send} />
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onFollowup={send} />
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                Thinking…
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[var(--color-border)] pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about equipment, procedures, compliance, or incidents…"
          className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-accent)] text-white transition-colors hover:bg-[var(--color-accent-strong)] disabled:opacity-40"
        >
          <Send className="size-4" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}

function EmptyState({ suggestions, onSelect }: { suggestions: string[]; onSelect: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]">
        <Sparkles className="size-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Ask your knowledge layer anything</p>
        <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">
          Every answer cites the source document it came from.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-white/[0.02] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-white/[0.05] hover:text-[var(--color-text-primary)]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, onFollowup }: { message: ChatMessage; onFollowup: (q: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-lg rounded-[var(--radius-card)] rounded-br-sm bg-[var(--color-accent)] px-4 py-2.5 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="max-w-lg rounded-[var(--radius-card)] rounded-bl-sm border border-[var(--color-critical)]/20 bg-[var(--color-critical-soft)] px-4 py-2.5 text-xs text-[var(--color-critical)]">
        {message.error}
      </div>
    );
  }

  const response = message.response;

  return (
    <div className="max-w-2xl">
      <div className="glass rounded-[var(--radius-card)] rounded-bl-sm border border-[var(--color-border)] px-4 py-3.5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">{message.text}</p>

        {response && (
          <>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone={response.reasoning_available ? "success" : "default"} dot>
                {response.reasoning_available ? "AI synthesis" : "Retrieval only"}
              </Badge>
              
              <span className="font-mono-tabular text-[10px] text-[var(--color-text-muted)]">
                {Math.round(response.confidence * 100)}% confidence
              </span>
            </div>

            {response.sources.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Sources
                </p>
                {response.sources.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                    <FileText className="mt-0.5 size-3 shrink-0 text-[var(--color-text-muted)]" strokeWidth={1.75} />
                    <span className="font-mono-tabular">{s.filename}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {response && response.suggested_followups.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {response.suggested_followups.map((q) => (
            <button
              key={q}
              onClick={() => onFollowup(q)}
              className={cn(
                "rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-[11px] text-[var(--color-text-secondary)]",
                "transition-colors hover:bg-white/[0.05] hover:text-[var(--color-text-primary)]"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
