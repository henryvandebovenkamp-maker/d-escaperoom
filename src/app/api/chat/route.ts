// PATH: src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic"; // nooit cachen
export const runtime = "nodejs";        // Prisma vereist Node runtime (geen Edge)

// ---- Prisma (global re-use in dev) ----
declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}
const prisma = global._prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global._prisma = prisma;

// ---- Validatie ----
const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  role: z.enum(["CONSUMER", "PARTNER", "ADMIN"]).default("CONSUMER"),
  locale: z.enum(["nl", "en", "de", "es"]).default("nl"),
  sessionId: z.string().optional(),
});

// ---- System prompt (korte, feitelijke richtlijnen) ----
function systemPrompt(locale: "nl" | "en" | "de" | "es", role: "CONSUMER" | "PARTNER" | "ADMIN") {
  // Voor nu focussen we op NL (je kunt EN/DE/ES later invullen):
  if (locale !== "nl") {
    return `Answer in ${locale.toUpperCase()}. If unsure, ask one clarifying question. Keep it concise and helpful.`;
  }

  const common = `
Je bent de helpdesk-assistent van D-EscapeRoom (mens + hond escaperoom).
Stijl: kort, vriendelijk, concreet. Antwoord in het Nederlands.

Feiten:
- Boeken: kies hondenschool → datum → tijdslot (60 min; speeltijd ±45 min).
- Capaciteit: per slot 1 boeking, max 3 spelers; advies: 1 hond.
- Prijs: basis + evt. avond/weekendtoeslag (verschilt per slot).
- Betaling: nu alleen aanbetaling via Mollie = partner feePercent% van het totaal; rest op locatie.
- Kalenderkleuren: Groen = meerdere slots, Oranje = nog enkele, Paars = vol.
- Annuleren/omboeken: in principe mogelijk tot ~24 uur vooraf (precies volgens bevestigingsmail/locatiebeleid).
- Geen aannames over live-beschikbaarheid; verwijs zo nodig naar de boekingswidget.
- Geen interne admin/partner links of interne info delen.
- Bij onduidelijkheid: stel maximaal 1 gerichte vervolgvraag.
- Support: verwijs naar info@d-escaperoom.com wanneer passend.
`.trim();

  const partnerNote =
    role === "PARTNER"
      ? `
Extra voor PARTNER:
- Je kunt partners helpen met uitleg over: slots publiceren (status: oranje concept, groen gepubliceerd, paars geboekt), fee%/aanbetaling, dashboard met boekingen/aanbetalingen/bezetting.
- Deel geen privacygevoelige of andere partnerspecifieke data.`
      : "";

  return [common, partnerNote].filter(Boolean).join("\n\n");
}

// ---- OpenAI call (API) ----
async function callOpenAI(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      answer: "De chat is tijdelijk niet beschikbaar (config). Mail ons via info@d-escaperoom.com.",
      debug: { reason: "NO_OPENAI_KEY" },
    };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 400,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    return {
      answer: "Er ging iets mis met beantwoorden. Mail ons via info@d-escaperoom.com.",
      debug: { status: res.status, err: errText },
    };
  }

  const json = await res.json();
  const answer = json?.choices?.[0]?.message?.content?.trim() || "Ik kan nu even geen antwoord genereren.";
  return { answer, debug: { model: json?.model, usage: json?.usage } };
}

// ---- Handler ----
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request", issues: parsed.error.flatten() }, { status: 400 });
    }
    const { message, role, locale, sessionId: incomingSid } = parsed.data;

    // --- Session ophalen/aanmaken ---
    let sessionId = incomingSid;
    let session =
      sessionId
        ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
        : null;

    if (!session) {
      // Geen (geldige) sessie gevonden → aanmaken
      if (sessionId) {
        // aanmaken met meegegeven id (compatibel met localStorage-ids)
        session = await prisma.chatSession.create({
          data: { id: sessionId, role, locale },
        });
      } else {
        // laat Prisma cuid() genereren
        session = await prisma.chatSession.create({
          data: { role, locale },
        });
        sessionId = session.id;
      }
    } else {
      // Sessie bestaat → role/locale updaten (laatste voorkeur leidend)
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { role, locale },
      });
    }

    // --- Userbericht opslaan ---
    await prisma.chatMessage.create({
      data: { sessionId: session.id, from: "user", content: message },
    });

    // --- Geschiedenis ophalen (laatste ~16 berichten) ---
    const history = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      take: 16,
      select: { from: true, content: true },
    });

    // --- Berichten voor LLM opbouwen ---
    const sys = systemPrompt(locale, role);
    const llmMsgs: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: sys },
      ...history.map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.content,
      })) as { role: "user" | "assistant"; content: string }[],
    ];

    // --- OpenAI aanroepen ---
    const { answer, debug } = await callOpenAI(llmMsgs);

    // --- Antwoord opslaan ---
    await prisma.chatMessage.create({
      data: { sessionId: session.id, from: "assistant", content: answer },
    });

    const payload: any = { sessionId: session.id, answer };
    if (process.env.DEBUG_CHAT === "1") payload.debug = debug;

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error("API /api/chat error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
