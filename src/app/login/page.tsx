// PATH: src/app/login/page.tsx
"use client";

import * as React from "react";
import Header from "@/components/Header";

/* ================= Types ================ */
type ApiOk =
  | { ok: true; devCode?: string }
  | {
      ok: true;
      created?: boolean;
      session?: { role?: "ADMIN" | "PARTNER"; partnerSlug?: string | null };
    };
type ApiErr = { ok?: false; error?: string };

/* ================= Helpers ================ */
async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  if (!res.ok) {
    let msg = "";
    try {
      msg = ((await res.json()) as ApiErr)?.error || "";
    } catch {
      msg = await res.text();
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

function sanitizePath(p: string) {
  return p.replace(/\/\(([^)]+)\)(?=\/|$)/g, "");
}

function computeSafeReturnTo(role: "ADMIN" | "PARTNER", fallback?: string) {
  const usp =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const raw = usp?.get("returnTo") || fallback || "";
  const cleaned = sanitizePath(raw);

  if (!cleaned.startsWith("/"))
    return role === "ADMIN" ? "/admin/dashboard" : "/partner/dashboard";

  if (role === "ADMIN") {
    if (cleaned === "/" || cleaned.startsWith("/partner/")) return "/admin/dashboard";
    return cleaned;
  } else {
    if (cleaned === "/" || cleaned.startsWith("/admin/")) return "/partner/dashboard";
    return cleaned;
  }
}

/* ================= Component ================ */
export default function LoginPage(): React.ReactElement {
  const [phase, setPhase] = React.useState<"request" | "verify">("request");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const submittedRef = React.useRef(false);

  React.useEffect(() => {
    if (phase === "verify") submittedRef.current = false;
  }, [phase]);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const r = await postJSON<ApiOk>("/api/auth/login/request", { email: cleanEmail });
      setPhase("verify");
      if ("devCode" in r && r.devCode) setMsg(`DEV code: ${r.devCode}`);
      else setMsg("Code verzonden (check je e-mail).");
    } catch (e: any) {
      setErr(typeof e?.message === "string" ? e.message : "Verzenden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (submittedRef.current) return;

    const normalized = code.replace(/\D+/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      setErr("Vul een geldige 6-cijferige code in.");
      return;
    }

    submittedRef.current = true;
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const r = await postJSON<ApiOk>("/api/auth/login/verify", {
        email: cleanEmail,
        code: normalized,
      });

      if ("created" in r && r.created) {
        setMsg("Je account is aangemaakt. We helpen je verder in het portaal.");
      }

      const role = ("session" in r && r.session?.role) || "ADMIN";
      const target = computeSafeReturnTo(role);
      window.location.replace(target);
    } catch (e: any) {
      setErr(typeof e?.message === "string" ? e.message : "Verificatie mislukt.");
      submittedRef.current = false;
      setLoading(false);
    }
  }

  function resetToEmail() {
    setPhase("request");
    setMsg(null);
    setErr(null);
    setCode("");
  }

  const headerTitle = phase === "request" ? "Inloggen" : "Voer je code in";
  const headerSub =
    phase === "request"
      ? "We sturen je een 6-cijferige code."
      : `Code is naar ${email || "je e-mail"} gestuurd.`;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Header zoals op de homepage */}
      <Header />

      {/* Content */}
      <section className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Card */}
          <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-stone-200">
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight">{headerTitle}</h1>
              <p className="mt-1 text-sm text-stone-600">{headerSub}</p>
            </div>

            {/* Step indicator */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div
                className={`rounded-xl py-2 text-center text-xs font-semibold ring-1 ${
                  phase === "request"
                    ? "bg-pink-50 text-pink-700 ring-pink-200"
                    : "bg-stone-50 text-stone-600 ring-stone-200"
                }`}
              >
                1. E-mail
              </div>
              <div
                className={`rounded-xl py-2 text-center text-xs font-semibold ring-1 ${
                  phase === "verify"
                    ? "bg-pink-50 text-pink-700 ring-pink-200"
                    : "bg-stone-50 text-stone-600 ring-stone-200"
                }`}
              >
                2. Code
              </div>
            </div>

            {/* Forms */}
            <div className="mt-5">
              {phase === "request" ? (
                <form onSubmit={onRequest} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium">
                      E-mailadres
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jij@example.com"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!email || loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:opacity-50"
                  >
                    {loading ? "Versturen…" : "Verstuur code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={onVerify} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="code" className="mb-1 block text-sm font-medium">
                      6-cijferige code
                    </label>
                    <input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      pattern="\\d{6}"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D+/g, ""))}
                      placeholder="000000"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-center text-lg tracking-widest shadow-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
                      aria-describedby="code-help"
                    />
                    <p id="code-help" className="mt-1 text-xs text-stone-500">
                      De code is 10 minuten geldig.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || code.length < 6 || submittedRef.current}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:opacity-50"
                  >
                    {loading ? "Inloggen…" : "Verifiëren"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={resetToEmail}
                      className="mt-2 text-sm font-medium text-stone-700 underline underline-offset-4 hover:text-stone-900"
                    >
                      Andere e-mail gebruiken
                    </button>
                  </div>
                </form>
              )}

              {/* Messages */}
              {msg && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                >
                  {msg}
                </div>
              )}
              {err && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                >
                  {err}
                </div>
              )}

              <p className="mt-6 text-center text-xs text-stone-500">
                Door in te loggen ga je akkoord met ons beleid. Problemen? Neem contact op met
                support.
              </p>
            </div>
          </div>

          {/* Compacte bulletlijst — zonder Partnerprofiel & Kortingscodes */}
          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {[
              { icon: "📊", title: "Dashboard", text: "Overzicht van jouw gegevens" },
              { icon: "🗓️", title: "Tijdsloten", text: "Beheer jouw tijdsloten" },
              { icon: "📅", title: "Agenda", text: "Overzicht van jouw boekingen" },
              { icon: "💶", title: "Omzet", text: "Bekijk jouw omzet cijfsrs" },
            ].map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-2 rounded-xl bg-white/70 p-3 ring-1 ring-stone-200 shadow-sm"
              >
                <span className="mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-stone-600">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Teruglink */}
          <p className="mt-4 text-center text-xs text-stone-500">
            Terug naar{" "}
            <a
              href="/"
              className="font-medium text-pink-700 underline underline-offset-4 hover:text-pink-800"
            >
              D-EscapeRoom
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
