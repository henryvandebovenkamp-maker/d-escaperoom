"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type ApiOk = {
  ok: true;
  devCode?: string;
  created?: boolean;
  session?: { role?: "ADMIN" | "PARTNER"; partnerSlug?: string | null };
};
type ApiErr = { ok?: false; error?: string };

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin", // ✅ cookie zetten/lezen
  });
  if (!res.ok) {
    let msg = "";
    try { msg = ((await res.json()) as ApiErr)?.error || ""; } catch { msg = await res.text(); }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function AdminLoginClient() {
  const r = useRouter();
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

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await postJSON<ApiOk>("/api/auth/login/request", { email: cleanEmail });
      setPhase("verify");
      if (res.devCode) setMsg(`DEV-code: ${res.devCode}`);
    } catch (e: any) {
      setErr(e.message || "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (submittedRef.current) return;

    const normalized = code.replace(/[\s-]+/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      setErr("Vul een geldige 6-cijferige code in.");
      return;
    }

    submittedRef.current = true;
    setErr(null); setMsg(null); setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await postJSON<ApiOk>("/api/auth/login/verify", { email: cleanEmail, code: normalized });

      if (res.created) {
        setMsg("Je account is aangemaakt. We helpen je verder in het partnerportaal.");
      }

      const role = res.session?.role;
      // ✅ correcte paden
      if (role === "ADMIN") r.replace("/admin/(protected)/dashboard");
      else if (role === "PARTNER") r.replace("/partner/(protected)/dashboard");
      else r.replace("/admin/(protected)/dashboard");
    } catch (e: any) {
      setErr(e.message || "Verifiëren mislukt");
      submittedRef.current = false;
      setLoading(false);
    }
  }

  function changeEmail() {
    setPhase("request");
    setCode(""); setMsg(null); setErr(null);
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin login</h1>

      {phase === "request" && (
        <form onSubmit={handleRequest} className="space-y-4" aria-label="Login code aanvragen">
          <label className="block">
            <span className="text-sm">E-mail</span>
            <input
              className="mt-1 w-full rounded border p-2"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@example.com"
            />
          </label>
          <button
            disabled={loading || !email}
            className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          >
            {loading ? "Versturen…" : "Stuur inlogcode"}
          </button>
        </form>
      )}

      {phase === "verify" && (
        <form id="verify-form" onSubmit={handleVerify} className="space-y-4" aria-label="Login code verifiëren">
          <p className="text-sm">
            Code is gemaild naar <b>{email}</b>.{" "}
            <button type="button" onClick={changeEmail} className="underline">E-mail wijzigen</button>
          </p>
          <label className="block">
            <span className="text-sm">6-cijferige code</span>
            <input
              className="mt-1 w-full rounded border p-2 tracking-widest"
              inputMode="numeric"
              pattern="\\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D+/g, ""))}
              required
            />
          </label>
          <button
            disabled={loading || code.length < 6 || submittedRef.current}
            className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          >
            {loading ? "Inloggen…" : "Inloggen"}
          </button>
        </form>
      )}

      {msg && <p className="text-xs text-stone-700">{msg}</p>}
      {err && <p className="text-sm text-rose-600">{err}</p>}
    </main>
  );
}
