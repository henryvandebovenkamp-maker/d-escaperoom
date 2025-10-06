// PATH: src/app/api/auth/login/request/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "node:crypto";

// Optioneel mailen als SMTP is geconfigureerd
let sendMail: null | ((to: string, code: string) => Promise<void>) = null;
try {
  // Lazy import om edge bundling issues te voorkomen
  const mod = await import("@/lib/mail");
  const { transporter } = mod as any;
  if (transporter) {
    sendMail = async (to: string, code: string) => {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: "Je D-EscapeRoom inlogcode",
        text: `Je inlogcode is: ${code}\n\nDe code is 10 minuten geldig.`,
        html: `<p>Je inlogcode is <b>${code}</b>.</p><p>De code is 10 minuten geldig.</p>`,
      });
    };
  }
} catch {
  // geen mail.ts aanwezig of geen transporter: prima, dan loggen we alleen
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const isProd = process.env.NODE_ENV === "production";
const echoInProd = process.env.DEV_LOGIN_ECHO === "1";

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = (body?.email ?? "") as string;
    const cleanEmail = emailRaw.trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ ok: false, error: "Email verplicht" }, { status: 400 });
    }

    // Enumeration protection: altijd zelfde response, ook als user niet bestaat
    const user = await prisma.appUser?.findUnique?.({ where: { email: cleanEmail } })
               ?? await (prisma as any).user?.findUnique?.({ where: { email: cleanEmail } });

    // Genereer altijd een code (ook als user niet bestaat) om timing leaks te beperken
    const code = genCode();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minuten

    // Invalideer oude, ongebruikte codes voor dit e-mailadres (netjes/veiliger)
    await prisma.loginCode.updateMany({
      where: { email: cleanEmail, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    // Sla nieuwe code op (ook als user niet bestaat; consistent gedrag)
    await prisma.loginCode.create({
      data: { email: cleanEmail, codeHash, expiresAt },
    });

    // Log altijd in dev (super handig bij testen)
    if (!isProd || echoInProd) {
      console.log(`[LOGIN] Code voor ${cleanEmail}: ${code} (geldig t/m ${expiresAt.toISOString()})`);
    } else {
      console.log(`[LOGIN] Code aangevraagd voor ${cleanEmail} (prod, geen echo)`);
    }

    // E-mail versturen als SMTP aanwezig is én de gebruiker bestaat
    // (Wil je ook mailen als user (nog) niet bestaat? Haal de "&& user" weg.)
    if (sendMail && user) {
      try {
        await sendMail(cleanEmail, code);
      } catch (mailErr) {
        console.warn("[login/request] mail versturen mislukt:", mailErr);
        // Fout bij mailen mag de flow niet blokkeren
      }
    }

    return NextResponse.json({
      ok: true,
      // alleen in dev (of met DEV_LOGIN_ECHO=1) geven we de code terug
      devCode: (!isProd || echoInProd) ? code : undefined,
    });
  } catch (err) {
    console.error("[/api/auth/login/request] error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
