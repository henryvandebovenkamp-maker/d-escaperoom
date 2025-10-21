// PATH: src/components/ChatbotWidget.tsx
"use client";
import * as React from "react";

type Locale = "nl" | "en" | "de" | "es";
type Props = { defaultLocale?: Locale };
type Msg = { id: string; from: "user" | "assistant"; text: string };

const cls = (...s: (string | false | null | undefined)[]) => s.filter(Boolean).join(" ");

export default function ChatbotWidget({ defaultLocale = "nl" }: Props) {
  const locale: Locale = defaultLocale;

  const [open, setOpen] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | undefined>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("de-chat-sid") || undefined : undefined
  );
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([
    { id: "m0", from: "assistant", text: "Hoi! Waar kan ik je mee helpen?" },
  ]);

  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Scroll naar laatste bericht
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Focus input zodra widget opent
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  // SessionId opslaan
  React.useEffect(() => {
    if (sessionId) localStorage.setItem("de-chat-sid", sessionId);
  }, [sessionId]);

  // ESC om te sluiten
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const msg = input.trim();
    if (!msg || busy) return;

    setError(null);
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", text: msg }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, role: "CONSUMER", locale, sessionId }),
      });

      const json = await res.json();
      if (json?.sessionId) setSessionId(json.sessionId);

      const answer: string =
        (json?.answer && String(json.answer)) ||
        (locale === "nl"
          ? "Er ging iets mis. Mail ons via info@d-escaperoom.com, dan helpen we je verder."
          : "Something went wrong. Please email info@d-escaperoom.com.");

      setMessages((m) => [...m, { id: crypto.randomUUID(), from: "assistant", text: answer }]);

      if (process.env.NEXT_PUBLIC_DEBUG_CHAT === "1" && json?.debug) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), from: "assistant", text: `🔎 Debug: ${JSON.stringify(json.debug)}` },
        ]);
      }
    } catch {
      setError("Netwerkfout. Probeer later opnieuw.");
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          from: "assistant",
          text:
            locale === "nl"
              ? "Ik kan nu niet antwoorden door een netwerkfout. Mail ons via info@d-escaperoom.com."
              : "I can’t reply due to a network error. Please email info@d-escaperoom.com.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const labelVA = "VRAAG & ANTWOORD";
  const SUGGESTIONS = [
    "Wat kost het en hoe betaal ik?",
    "Kan ik mijn boeking verplaatsen?",
    "Hoelang duurt een sessie?",
  ];

  return (
    <div className="fixed z-30 bottom-3 right-3 sm:bottom-5 sm:right-5 pointer-events-auto" data-no-print>
      {/* Gesloten: compacte 'VRAAG & ANTWOORD' pill */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title={`Open chat & ${labelVA}`}
          aria-label={`Open chat en ${labelVA.toLowerCase()}`}
          aria-expanded={open}
          className={cls(
            "inline-flex items-center gap-2 h-10 rounded-full",
            "px-5 border border-stone-300 bg-white/95 text-stone-800",
            "shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
            "text-[14px] font-semibold leading-none"
          )}
        >
          <span aria-hidden>{labelVA}</span>
          <span className="sr-only">Open chat en {labelVA.toLowerCase()}</span>
        </button>
      )}

      {/* Open paneel: slanker, echte chat-vorm */}
      {open && (
        <div
          role="dialog"
          aria-label={`Chat & ${labelVA}`}
          aria-modal="false"
          className={cls(
            "w-[320px] sm:w-[360px] rounded-xl",
            "border border-stone-200 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden",
            "motion-safe:transition-all motion-safe:duration-150"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 bg-stone-50">
            <div className="min-w-0">
              <p className="text-[11px] leading-4 text-stone-600">D-EscapeRoom</p>
              <h3 className="text-[14px] font-semibold text-stone-900">Chat • {labelVA}</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-stone-700 hover:text-stone-900 hover:bg-white border border-transparent hover:border-stone-300 text-[14px]"
              aria-label="Sluit chat"
              title="Sluiten"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="max-h-[56vh] overflow-y-auto p-3 space-y-2 text-[14px] bg-white"
            aria-live="polite"
            role="log"
          >
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={cls(
                    "px-3 py-2 rounded-lg shadow-sm",
                    m.from === "user" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-800"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-lg bg-stone-100 text-stone-500 shadow-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse [animation-delay:150ms]">●</span>
                    <span className="animate-pulse [animation-delay:300ms]">●</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions (één regeltje, optioneel) */}
          <div className="px-3 pb-1 pt-0.5 bg-white border-t border-stone-200">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    setTimeout(send, 0);
                  }}
                  className="whitespace-nowrap text-[12.5px] rounded-full border border-stone-300 px-3 py-1 hover:bg-stone-50"
                  aria-label={`Stel: ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-stone-200 bg-stone-50">
            <div className="flex items-end gap-1.5">
              <label htmlFor="de-chat-input" className="sr-only">
                Bericht
              </label>
              <textarea
                ref={inputRef}
                id="de-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={busy ? "Bezig met antwoorden..." : "Typ je vraag…"}
                className="flex-1 resize-none rounded-md border border-stone-300 px-2.5 py-1.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className={cls(
                  "shrink-0 h-9 px-3 rounded-md text-white text-[13px] font-semibold",
                  "bg-stone-900 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
                  "disabled:opacity-50"
                )}
                aria-label="Verstuur bericht"
              >
                Verstuur
              </button>
            </div>
            {!!error && <p className="mt-1 text-[12px] text-stone-700">{error}</p>}
            <p className="mt-1 text-[11.5px] leading-5 text-stone-500">
              Antwoorden zijn informatief en niet-bindend. Mail: info@d-escaperoom.com
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
