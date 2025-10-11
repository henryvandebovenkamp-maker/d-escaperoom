// PATH: src/app/api/auth/login/request/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "node:crypto";
import { sendTemplateMail, APP_ORIGIN } from "@/lib/mail"; // ⬅️ NIEUW

export const runtime = "nodejs";        // Prisma/Nodemailer -> Node runtime
export const dynamic = "force-dynamic"; // geen caching

/* =============== Helpers =============== */
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const isProd = process.env.NODE_ENV === "production";
const echoInProd = process.env.DEV_LOGIN_ECHO === "1";

function genCode() {
  // 6 digits
  return String(Math.floor(100000 + Math.random() * 900000));
}
function detectLocale(req: Request): "nl" | "en" | "de" | "es" {
  const h = req.headers.get("accept-language") || "";
  const cand = h.split(",")[0]?.toLowerCase() ?? "";
  if (cand.startsWith("nl")) return "nl";
  if (cand.startsWith("de")) return "de";
  if (cand.startsWith("es")) return "es";
  return "en";
}

/* =============== Route =============== */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = (body?.email ?? "") as string;
    const cleanEmail = emailRaw.trim().toLowerCase();
    const locale = (body?.locale as "nl" | "en" | "de" | "es" | undefined) ?? detectLocale(req);

    if (!cleanEmail) {
      return NextResponse.json({ ok: false, error: "Email verplicht" }, { status: 400 });
    }

    // Enumeration protection: haal user *indien aanwezig* op, maar gedraag je identiek als 'ie niet bestaat
    const user =
      (await prisma.appUser?.findUnique?.({ where: { email: cleanEmail } })) ??
      (await (prisma as any).user?.findUnique?.({ where: { email: cleanEmail } }));

    // Genereer ALTIJD een code (ook als user niet bestaat) om timing leaks te beperken
    const code = genCode();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minuten

    // Invalideer nog geldige, ongebruikte codes voor dit e-mailadres
    await prisma.loginCode.updateMany({
      where: { email: cleanEmail, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    // Sla de nieuwe code gehasht op (ook als user niet bestaat; consistent gedrag)
    await prisma.loginCode.create({
      data: { email: cleanEmail, codeHash, expiresAt },
    });

    // Handig in dev (of als je echo forceert in prod)
    if (!isProd || echoInProd) {
      console.log(
        `[LOGIN] Code voor ${cleanEmail}: ${code} (geldig t/m ${expiresAt.toISOString()})`
      );
    } else {
      console.log(`[LOGIN] Code aangevraagd voor ${cleanEmail} (prod, geen echo)`);
    }

    // === Nieuwe mail-flow via lib ===
    try {
      // Tip: wil je óók mailen als user (nog) niet bestaat? Verwijder de && user check.
      if (user) {
        const loginUrl = `${APP_ORIGIN}/login?email=${encodeURIComponent(cleanEmail)}`;
        await sendTemplateMail({
          to: cleanEmail,
          template: "login_code",
          vars: { code, loginUrl }, // NL-only template verwacht deze keys
        });
      }
    } catch (mailErr) {
      // Mail subsystem niet aanwezig of versturen mislukt → nooit de login-flow blokkeren
      console.warn("[login/request] mail versturen overgeslagen of mislukt:", mailErr);
    }

    return NextResponse.json({
      ok: true,
      // Alleen in dev of met DEV_LOGIN_ECHO=1 sturen we de code terug
      devCode: !isProd || echoInProd ? code : undefined,
      // optioneel: locale teruggeven als je dat gebruikt in de UI
      locale,
    });
  } catch (err) {
    console.error("[/api/auth/login/request] error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
