// PATH: src/app/login/page.tsx
"use client";
import * as React from "react";

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
    credentials: "same-origin", // cookies zetten & meesturen
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

// Strip route-group segmenten zoals /(protected)/ uit paden
function sanitizePath(p: string) {
  return p.replace(/\/\(([^)]+)\)(?=\/|$)/g, "");
}

// Bepaal veilige returnTo op basis van rol + huidige querystring
function computeSafeReturnTo(role: "ADMIN" | "PARTNER", fallback?: string) {
  const usp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const raw = usp?.get("returnTo") || fallback || "";
  const cleaned = sanitizePath(raw);

  // Alleen interne paden toestaan
  if (!cleaned.startsWith("/")) return role === "ADMIN" ? "/admin/dashboard" : "/partner/dashboard";

  // Rol-compatibiliteit afdwingen
  if (role === "ADMIN") {
    // admin mag overal heen; bij lege of partnerpad → dashboard
    if (cleaned === "/" || cleaned.startsWith("/partner/")) return "/admin/dashboard";
    return cleaned;
  } else {
    // partner mag niet naar /admin/*
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
      // DEV hint
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

      // Rol bepalen (default ADMIN om safe te zijn)
      const role = ("session" in r && r.session?.role) || "ADMIN";

      // Veilige target bepalen: sanitized returnTo of rol-fallback
      const target = computeSafeReturnTo(role);

      // Navigeer (replace om history-sprongen te vermijden)
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
      {/* Hero */}
      <div className="border-b border-stone-200 bg-gradient-to-b from-stone-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
            <h1 className="text-3xl font-extrabold tracking-tight">
              D-EscapeRoom · Partner/Admin
            </h1>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            Log in met je e-mail. Geen wachtwoord nodig.
          </p>
        </div>
      </div>

      {/* Card */}
      <section className="mx-auto my-auto w-full max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white/95 p-6 shadow-md ring-1 ring-stone-200 backdrop-blur-sm">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-extrabold">{headerTitle}</h2>
            <p className="mt-1 text-sm text-stone-600">{headerSub}</p>
          </div>

          {/* Step indicator */}
          <div className="mb-6 grid grid-cols-2 text-xs font-semibold rounded-xl overflow-hidden">
            <div
              className={`py-2 text-center ${
                phase === "request"
                  ? "bg-pink-50 border border-pink-200 text-pink-700"
                  : "bg-stone-50 border border-stone-200 text-stone-600"
              }`}
            >
              1. E-mail
            </div>
            <div
              className={`py-2 text-center ${
                phase === "verify"
                  ? "bg-pink-50 border border-pink-200 text-pink-700"
                  : "bg-stone-50 border border-stone-200 text-stone-600"
              }`}
            >
              2. Code
            </div>
          </div>

          {phase === "request" && (
            <form onSubmit={onRequest} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-800">
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
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
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
          )}

          {phase === "verify" && (
            <form onSubmit={onVerify} className="space-y-4" noValidate>
              <div>
                <label htmlFor="code" className="mb-1 block text-sm font-medium text-stone-800">
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
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-lg tracking-widest shadow-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
                />
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

          {/* Footer hint */}
          <p className="mt-6 text-center text-xs text-stone-500">
            Door in te loggen ga je akkoord met ons beleid. Problemen? Neem contact op met support.
          </p>
        </div>
      </section>
    </main>
  );
}
