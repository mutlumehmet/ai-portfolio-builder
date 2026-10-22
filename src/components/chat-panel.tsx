"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@site-config";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = siteConfig.chat.suggestions;

const STATIC_PLACEHOLDER = "Ask a question…";

// Typed into the empty input one by one, so visitors notice it is a place to type.
// Kept different from SUGGESTIONS so the two don't repeat each other.
const PLACEHOLDER_PROMPTS = siteConfig.chat.placeholderPrompts;

const TYPE_MS = 45;
const DELETE_MS = 25;
const HOLD_MS = 1600;
const GAP_MS = 400;
const CARET = "|";
const BLINK_MS = 530;

/**
 * Cycles through prompts, typing and deleting each one, while `active`.
 * Returns the static placeholder when inactive or when the user prefers reduced motion.
 */
function useTypewriterPlaceholder(prompts: readonly string[], active: boolean) {
  // null until the animation has typed its first character, so a stale half word never shows
  const [text, setText] = useState<string | null>(null);
  const [caretOn, setCaretOn] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || reduceMotion || prompts.length === 0) return;

    let prompt = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const full = prompts[prompt];
      if (!deleting) {
        chars += 1;
        setText(full.slice(0, chars));
        if (chars === full.length) {
          deleting = true;
          timer = setTimeout(tick, HOLD_MS);
          return;
        }
        timer = setTimeout(tick, TYPE_MS);
      } else {
        chars -= 1;
        setText(full.slice(0, chars));
        if (chars === 0) {
          deleting = false;
          prompt = (prompt + 1) % prompts.length;
          timer = setTimeout(tick, GAP_MS);
          return;
        }
        timer = setTimeout(tick, DELETE_MS);
      }
    };

    timer = setTimeout(tick, GAP_MS);
    const blink = setInterval(() => setCaretOn((on) => !on), BLINK_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(blink);
      setText(null);
      setCaretOn(true);
    };
  }, [prompts, active]);

  if (!active || text === null) return STATIC_PLACEHOLDER;
  // A hidden caret keeps its width as a thin space, so the text does not jiggle
  return text + (caretOn ? CARET : "\u2009");
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const placeholder = useTypewriterPlaceholder(PLACEHOLDER_PROMPTS, !isFocused && input === "");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

  async function send(text: string) {
    if (!text.trim() || isPending) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.ok ? data.answer : data.error },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Couldn't reach the chat right now. Try again shortly." },
      ]);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex h-72 flex-col gap-3 overflow-y-auto rounded-lg border-2 border-border bg-background p-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-lg border-2 border-border bg-card px-3 py-2 text-left text-sm font-bold shadow-brutal-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg border-2 border-border px-3 py-2 text-sm ${
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-card"
            }`}
          >
            {m.text}
          </div>
        ))}
        {isPending && (
          <div className="self-start rounded-lg border-2 border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          aria-label={STATIC_PLACEHOLDER}
          className="h-10 flex-1 rounded-lg border-2 border-border bg-background px-3 text-sm placeholder:text-muted-foreground"
        />
        <Button type="submit" size="sm" disabled={isPending || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
