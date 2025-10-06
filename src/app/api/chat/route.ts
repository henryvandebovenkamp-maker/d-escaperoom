// PATH: src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { answerQuestion, type Locale, type Role } from "@/lib/faq";

/** ✅ Draai op Node (niet Edge) om bundlegrootte-limiet te vermijden */
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // dit is altijd dynamisch (geen SSG)

/**
 * ENV verwacht:
 * - OPENAI_API_KEY=sk-...
 * - OPENAI_MODEL=gpt-4o-mini (default)
 * - ENABLE_CHAT_LOGS=0|1
 * - DEBUG_CHAT=0|1  (voegt 'debug' toe aan response)
 */
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEBUG = process.env.DEBUG_CHAT === "1";

/* ===================== Validation ===================== */
const Body = z.object({
  message: z.string().min(1).max(1000),
  role: z.enum(["CONSUMER", "PARTNER", "ADMIN"]).default("CONSUMER"),
  locale: z.enum(["nl", "en", "de", "es"]).default("nl"),
  sessionId: z.string().optional(),
});

/* ===================== Rate limiting (in-memory) ===================== */
type Bucket = { tokens: number; ts: number };
const BUCKETS: Record<string, Bucket> = {};
function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const b = BUCKETS[key] ?? { tokens: limit, ts: now };
  if (now - b.ts >= windowMs) {
    b.tokens = limit;
    b.ts = now;
  }
  if (b.tokens <= 0) return false;
  b.tokens -= 1;
  BUCKETS[key] = b;
  return true;
}

/* ===================== Helpers ===================== */
function json(data: unknown, init?: number | ResponseInit) {
  const res = NextResponse.json(data, typeof init === "number" ? { status: init } : init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

/** Eerst proberen met onze FAQ-logica (rol-neutraal). Null = graag AI fallback. */
function faqAnswer(message: string, role: Role, locale: Locale): string | null {
  const a = answerQuestion(message, role, locale);
  // Als de FAQ al de contactfallback geeft, laat AI het proberen.
  const FALLBACK_SNIPPETS = ["info@d-escaperoom.com", "info@d-escaperoom.nl"];
  const isFallback = FALLBACK_SNIPPETS.some((s) => a.toLowerCase().includes(s.toLowerCase()));
  return isFallback ? null : a;
}

/** OpenAI fallback met korte timeout en strikte system prompt */
async function aiAnswer(prompt: string, role: Role, locale: Locale) {
  if (!process.env.OPENAI_API_KEY) {
    return { text: null as string | null, debug: { reason: "NO_KEY" as const } };
  }

  const langName =
    locale === "nl" ? "Nederlands" :
    locale === "de" ? "Duits" :
    locale === "es" ? "Spaans" : "Engels";

  const system = [
    `Je bent een supportmedewerker van D-EscapeRoom (Western-thema).`,
    `Praat vriendelijk, duidelijk en menselijk, in 1–3 zinnen.`,
    `Antwoord altijd in ${langName}.`,
    `Productregels: 60-min tijdslot (±45 min speeltijd), max 3 spelers, 1 boeking per slot.`,
    `Betaling: aanbetaling via Mollie = partner fee% van totaal; restant op locatie; weekend/avond toeslag kan gelden.`,
    `Rol-context: ${role} (alleen gebruiken als nuttig, niets verzinnen).`,
    `Wees eerlijk: als je het niet zeker weet, zeg dat en verwijs naar info@d-escaperoom.com.`,
  ].join(" ");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 220,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const j = await r.json();
    if (!r.ok) {
      return { text: null, debug: { status: r.status, error: j?.error?.message || "openai_error" } };
    }
    const content: string | null = j?.choices?.[0]?.message?.content?.trim() ?? null;
    return { text: content, debug: null as Record<string, unknown> | null };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : "fetch_failed_or_timeout";
    return { text: null, debug: { error: msg } };
  }
}

/* ===================== Handler ===================== */
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  if (!rateLimit(`${ip}:chat`, 60, 60_000)) {
    return json({ error: "Too many requests" }, 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.message }, 400);
  }

  const { message, role, locale, sessionId } = parsed.data;

  // 1) FAQ → snel & goedkoop
  let answer: string | null = faqAnswer(message, role as Role, locale as Locale);

  // 2) AI fallback
  let debugInfo: Record<string, unknown> | null = null;
  if (!answer) {
    const { text, debug } = await aiAnswer(message, role as Role, locale as Locale);
    answer = text;
    debugInfo = debug;
  }

  // 3) Nette contactfallback wanneer AI ook niets gaf
  if (!answer) {
    const contact = "info@d-escaperoom.com";
    switch (locale) {
      case "nl":
        answer = `Ik weet het niet 100% zeker. Mail ons gerust op ${contact}, dan helpen we je persoonlijk verder.`;
        break;
      case "de":
        answer = `Ich bin nicht 100% sicher. Schreiben Sie uns an ${contact}, wir helfen Ihnen persönlich weiter.`;
        break;
      case "es":
        answer = `No estoy 100% seguro. Escríbenos a ${contact} y te ayudamos personalmente.`;
        break;
      default:
        answer = `I'm not 100% sure. Please email us at ${contact} and we'll help you personally.`;
    }
  }

  // 4) Optioneel loggen met Prisma (best effort; geen crash als model ontbreekt)
  if (process.env.ENABLE_CHAT_LOGS === "1") {
    try {
      const sess = sessionId
        ? await prisma.chatSession.update({ where: { id: sessionId }, data: { role, locale } })
        : await prisma.chatSession.create({ data: { role, locale } });

      await prisma.chatMessage.createMany({
        data: [
          { sessionId: sess.id, from: "user", content: message },
          { sessionId: sess.id, from: "assistant", content: answer! },
        ],
      });

      return json(
        DEBUG ? { answer, sessionId: sess.id, debug: debugInfo } : { answer, sessionId: sess.id },
        200
      );
    } catch {
      // Logging is nice-to-have; negeer fouten en ga door.
    }
  }

  // 5) Response
  return json(DEBUG ? { answer, debug: debugInfo } : { answer }, 200);
}
