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
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const raw = usp?.get("returnTo") || fallback || "";
  const cleaned = sanitizePath(raw);

  if (!cleaned.startsWith("/")) {
    return role === "ADMIN" ? "/admin/dashboard" : "/partner/dashboard";
  }

  if (role === "ADMIN") {
    if (cleaned === "/" || cleaned.startsWith("/partner/")) {
      return "/admin/dashboard";
    }

    return cleaned;
  }

  if (cleaned === "/" || cleaned.startsWith("/admin/")) {
    return "/partner/dashboard";
  }

  return cleaned;
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

      const r = await postJSON<ApiOk>("/api/auth/login/request", {
        email: cleanEmail,
      });

      setPhase("verify");

      if ("devCode" in r && r.devCode) {
        setMsg(`DEV code: ${r.devCode}`);
      } else {
        setMsg("Code verzonden. Check je e-mail.");
      }
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
      setErr(
        typeof e?.message === "string" ? e.message : "Verificatie mislukt."
      );
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
      ? "We sturen je een 6-cijferige code om veilig in te loggen."
      : `De code is naar ${email || "je e-mail"} gestuurd.`;

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Header />

      <section className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.16),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.35)_0%,rgba(12,10,9,0.96)_100%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
        </div>

        <div className="relative mx-auto max-w-xl">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-7">
            <div className="text-center">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
                PARTNER & ADMIN
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-rose-300 sm:text-5xl">
                {headerTitle}
              </h1>

              <p className="mt-4 text-sm leading-7 text-stone-300">
                {headerSub}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <div
                className={[
                  "rounded-2xl border px-3 py-2 text-center text-xs font-semibold",
                  phase === "request"
                    ? "border-rose-300/35 bg-rose-400/15 text-rose-100"
                    : "border-white/10 bg-white/10 text-stone-300",
                ].join(" ")}
              >
                1. E-mail
              </div>

              <div
                className={[
                  "rounded-2xl border px-3 py-2 text-center text-xs font-semibold",
                  phase === "verify"
                    ? "border-rose-300/35 bg-rose-400/15 text-rose-100"
                    : "border-white/10 bg-white/10 text-stone-300",
                ].join(" ")}
              >
                2. Code
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/35 p-5 backdrop-blur-md">
              {phase === "request" ? (
                <form onSubmit={onRequest} className="space-y-4" noValidate>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-stone-100"
                  >
                    E-mailadres
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jij@example.com"
                      className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={!email || loading}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Versturen…" : "Verstuur code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={onVerify} className="space-y-4" noValidate>
                  <label
                    htmlFor="code"
                    className="block text-xs font-semibold text-stone-100"
                  >
                    6-cijferige code
                    <input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      pattern="\\d{6}"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D+/g, ""))
                      }
                      placeholder="000000"
                      className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 text-center text-lg tracking-widest text-white outline-none transition placeholder:text-stone-500 focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
                      aria-describedby="code-help"
                    />
                  </label>

                  <p id="code-help" className="-mt-2 text-xs text-stone-400">
                    De code is 10 minuten geldig.
                  </p>

                  <button
                    type="submit"
                    disabled={loading || code.length < 6 || submittedRef.current}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Inloggen…" : "Verifiëren"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={resetToEmail}
                      className="mt-2 text-sm font-medium text-stone-300 underline underline-offset-4 transition hover:text-pink-300"
                    >
                      Andere e-mail gebruiken
                    </button>
                  </div>
                </form>
              )}

              {msg && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-sm text-emerald-100"
                >
                  {msg}
                </div>
              )}

              {err && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mt-4 rounded-xl border border-rose-300/30 bg-rose-400/15 px-3 py-2 text-sm text-rose-100"
                >
                  {err}
                </div>
              )}

              <p className="mt-5 text-center text-xs leading-5 text-stone-400">
                Door in te loggen ga je akkoord met ons beleid. Problemen? Neem
                contact op met support.
              </p>
            </div>
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              { icon: "📊", title: "Dashboard", text: "Overzicht" },
              { icon: "🗓️", title: "Tijdsloten", text: "Beheer tijdsloten" },
              { icon: "📅", title: "Agenda", text: "Boekingen/planning" },
              { icon: "💶", title: "Omzet", text: "Omzet cijfers" },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20 backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">{item.icon}</span>

                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-stone-400">{item.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-center text-xs text-stone-400">
            Terug naar{" "}
            <a
              href="/"
              className="font-medium text-pink-300 underline underline-offset-4 transition hover:text-pink-200"
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