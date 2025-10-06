"use client";
import * as React from "react";

const locales = ["nl", "en", "de", "es"] as const;
type Locale = (typeof locales)[number];

type Props = {
  defaultLocale?: Locale;
};

type Msg = { id: string; from: "user" | "assistant"; text: string };

const euroPink = "bg-pink-600 hover:bg-pink-700 focus-visible:ring-pink-500";

export default function ChatbotWidget({ defaultLocale = "nl" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [locale, setLocale] = React.useState<Locale>(defaultLocale);
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

  // Scroll naar laatste bericht
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Sla sessionId op (blijft binnen 1 browser sessie)
  React.useEffect(() => {
    if (sessionId) localStorage.setItem("de-chat-sid", sessionId);
  }, [sessionId]);

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
        body: JSON.stringify({
          message: msg,
          role: "CONSUMER", // rol-neutraal: backend zoekt in gezamenlijke FAQ
          locale,
          sessionId,
        }),
      });

      const json = await res.json();
      if (json?.sessionId) setSessionId(json.sessionId);

      const answer: string =
        (json?.answer && String(json.answer)) ||
        (locale === "nl"
          ? "Er ging iets mis. Mail ons via info@d-escaperoom.com, dan helpen we je verder."
          : "Something went wrong. Please email info@d-escaperoom.com.");

      setMessages((m) => [...m, { id: crypto.randomUUID(), from: "assistant", text: answer }]);

      // Debug hulp tijdens testen
      if (process.env.NEXT_PUBLIC_DEBUG_CHAT === "1" && json?.debug) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), from: "assistant", text: `🔎 Debug: ${JSON.stringify(json.debug)}` },
        ]);
      }
    } catch (e: any) {
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

  return (
    <div className="fixed z-50 bottom-6 right-6">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`px-5 py-3 rounded-xl text-white font-semibold shadow ${euroPink}`}
        >
          Chat & FAQ
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Chat & FAQ"
          aria-modal="false"
          className="w-[380px] sm:w-[420px] rounded-xl border border-stone-200 bg-white shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
            <div>
              <p className="text-xs text-stone-500">D-EscapeRoom</p>
              <h3 className="text-base font-semibold text-stone-900">Chat & FAQ</h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Taal"
                className="text-sm border rounded-md px-2 py-1 bg-white"
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
              >
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-500 hover:text-stone-700 text-sm"
                aria-label="Sluit chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="max-h-[55vh] overflow-y-auto p-4 space-y-3 text-sm bg-white"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-3 py-2 rounded-lg shadow-sm ${
                    m.from === "user" ? "bg-pink-600 text-white" : "bg-stone-100 text-stone-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-lg bg-stone-100 text-stone-500 shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-150">●</span>
                    <span className="animate-pulse delay-300">●</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-stone-200 bg-stone-50">
            <div className="flex items-center gap-2">
              <label htmlFor="de-chat-input" className="sr-only">
                Bericht
              </label>
              <textarea
                id="de-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={busy ? "Bezig met antwoorden..." : "Typ je vraag…"}
                className="flex-1 resize-none rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className={`shrink-0 px-4 py-2 rounded-md text-white text-sm font-semibold ${euroPink} disabled:opacity-50`}
              >
                Stuur
              </button>
            </div>
            {!!error && <p className="mt-2 text-[11px] text-pink-700">{error}</p>}
            <p className="mt-2 text-[11px] text-stone-500">
              Antwoorden zijn informatief en niet-bindend. Voor specifieke vragen: info@d-escaperoom.com
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
