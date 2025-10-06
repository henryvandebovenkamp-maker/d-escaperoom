// PATH: src/app/api/booking/update-customer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

/**
 * Kleine, in-memory rate limiter (IP-based).
 * Voor prod kun je dit vervangen door Upstash/Redis.
 */
const WINDOW_MS = 15_000; // 15s window
const MAX_HITS = 20;      // 20 requests per 15s per IP
const hits = new Map<string, { count: number; ts: number }>();

function rateLimit(ip: string) {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now - cur.ts > WINDOW_MS) {
    hits.set(ip, { count: 1, ts: now });
    return true;
  }
  cur.count++;
  if (cur.count > MAX_HITS) return false;
  return true;
}

/* ================== Validation ================== */
const BodySchema = z
  .object({
    bookingId: z.string().min(1, "bookingId ontbreekt"),
    customer: z
      .object({
        name: z
          .string()
          .trim()
          .min(1, "Naam mag niet leeg zijn")
          .max(120, "Naam is te lang")
          .optional()
          .nullable(),
        email: z
          .string()
          .trim()
          .email("Ongeldig e-mailadres")
          .max(190)
          .optional()
          .nullable(),
      })
      .refine((c) => Boolean((c.name && c.name.trim()) || (c.email && c.email.trim())), {
        message: "Niks te updaten",
        path: ["name"], // toon 1 melding
      }),
  })
  .strict();

function normalizeEmail(email?: string | null) {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e.length ? e : null;
}

/* ================== Helpers ================== */
function bookingSelect() {
  return {
    id: true,
    status: true,
    playersCount: true,
    totalAmountCents: true,
    depositAmountCents: true,
    restAmountCents: true,
    discountAmountCents: true,
    customer: { select: { id: true, name: true, email: true } },
    partner: { select: { id: true, name: true, feePercent: true } },
    slot: { select: { id: true, startTime: true } },
    discountCode: { select: { code: true } },
  } as const;
}

function toVM(b: any) {
  return {
    id: b.id,
    status: b.status,
    playersCount: b.playersCount,
    partner: b.partner
      ? { id: b.partner.id, name: b.partner.name, feePercent: b.partner.feePercent }
      : null,
    slot: b.slot ? { id: b.slot.id, startTime: b.slot.startTime?.toISOString?.() ?? b.slot.startTime } : null,
    customer: b.customer ? { name: b.customer.name ?? null, email: b.customer.email ?? "" } : null,
    totalAmountCents: b.totalAmountCents ?? 0,
    depositAmountCents: b.depositAmountCents ?? 0,
    restAmountCents: b.restAmountCents ?? 0,
    discountAmountCents: b.discountAmountCents ?? 0,
    discountCode: b.discountCode ? { code: b.discountCode.code } : null,
  };
}

/* ================== POST ================== */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "Te veel verzoeken. Probeer zo weer." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ ok: false, error: issues }, { status: 400 });
    }

    const { bookingId } = parsed.data;
    const name = parsed.data.customer.name?.trim() ?? null;
    const email = normalizeEmail(parsed.data.customer.email ?? null);

    // Haal boeking + huidige klant op
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        customerId: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Boeking niet gevonden" },
        { status: 404 }
      );
    }

    // Atomic update binnen transactie
    const updated = await prisma.$transaction(async (tx) => {
      let customerId = booking.customerId;

      // (a) Als er nog geen customer is, maak er één
      if (!customerId) {
        const created = await tx.customer.create({
          data: {
            name: name ?? undefined,
            email: email ?? "",
          },
          select: { id: true },
        });

        customerId = created.id;

        await tx.booking.update({
          where: { id: bookingId },
          data: { customerId },
          select: { id: true },
        });
      } else {
        // (b) Bestaat er al een customer? Werk bij wat is meegegeven
        const toUpdate: { name?: string; email?: string } = {};
        if (name !== null && name !== undefined) toUpdate.name = name;
        if (email !== null && email !== undefined) toUpdate.email = email;
        if (Object.keys(toUpdate).length) {
          await tx.customer.update({
            where: { id: customerId },
            data: toUpdate,
            select: { id: true },
          });
        }
      }

      // Retourneer volledige booking view
      return tx.booking.findUnique({
        where: { id: bookingId },
        select: bookingSelect(),
      });
    });

    return NextResponse.json({ ok: true, booking: toVM(updated) }, { status: 200 });
  } catch (err: any) {
    console.error("update-customer error:", err);
    // Prisma unique violation op email? (optioneel, afhankelijk van schema)
    const message =
      typeof err?.message === "string" && err.message.length < 300
        ? err.message
        : "Onbekende fout";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/* ================== Method guards ================== */
export function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
export function PUT() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
export function PATCH() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
export function DELETE() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
