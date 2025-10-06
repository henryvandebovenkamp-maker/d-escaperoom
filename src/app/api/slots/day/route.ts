// PATH: src/app/api/slots/day/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 12 vaste uren (pas aan indien nodig)
const TIMES_12 = [
  "09:00","10:00","11:00","12:00","13:00","14:00",
  "15:00","16:00","17:00","18:00","19:00","20:00",
] as const;

const GetSchema = z.object({
  partner: z.string().min(1),                       // partnerSlug; "all" toegestaan (geeft needsPartner)
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),     // YYYY-MM-DD
  base: z.coerce.number().int().min(1).max(48).optional().default(12),
});

const PostSchema = z.object({
  partner: z.string().min(1),                       // partnerSlug
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.number().int().min(0).max(23),
  action: z.enum(["publish", "unpublish"]),
});

function toDateLocal(isoDay: string, hh = 0, mm = 0) {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, (m as number) - 1, d as number, hh, mm, 0, 0);
}
function startEndOfDay(isoDay: string) {
  const start = toDateLocal(isoDay, 0, 0);
  const end = toDateLocal(isoDay, 23, 59);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = {
    partner: url.searchParams.get("partner"),
    day: url.searchParams.get("day"),
    base: url.searchParams.get("base") ?? undefined,
  };

  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = GetSchema.parse(parsed);

    // Logging (server)
    console.log("[/api/slots/day][GET] q:", q, "user.role:", user.role);

    // Admin met 'all' → geef needsPartner terug (helder signaal, geen lege lijst)
    if (user.role === "ADMIN" && q.partner === "all") {
      const baseTimes = (TIMES_12 as readonly string[]).slice(0, q.base);
      const diag = {
        note: "ADMIN used partner=all for day view. Needs concrete partner slug.",
        partnerParam: q.partner,
        day: q.day,
        baseTimes,
      };
      const res = NextResponse.json({ ok: true, needsPartner: true, slots: [], diag });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // Resolve partner (valideert scope voor PARTNER en staat ADMIN toe om andere slugs te kiezen)
    const partner = await resolvePartnerForRequest(user, q.partner);

    const { start, end } = startEndOfDay(q.day);

    // Alle echte slots (incl. BOOKED) van deze dag voor deze partner
    const realAll = await prisma.slot.findMany({
      where: { partnerId: partner.id, startTime: { gte: start, lte: end } },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, status: true },
    });

    // Bezettings-uren (ook BOOKED tellen)
    const occupied = new Set<number>(
      realAll.map(s => new Date(s.startTime).getHours())
    );

    const baseTimes = (TIMES_12 as readonly string[]).slice(0, q.base);
    const baseHours = baseTimes.map(t => Number(t.slice(0, 2)));

    // Virtuele DRAFT-sleuven (niet op bezette uren)
    const virtual = baseHours
      .filter(h => !occupied.has(h))
      .map(h => ({
        id: `virtual-${q.day}-${h}`,
        timeLabel: `${String(h).padStart(2, "0")}:00`,
        hour: h,
        status: "DRAFT" as const,
      }));

    // Echte slots
    const real = realAll.map(s => {
      const h = new Date(s.startTime).getHours();
      return {
        id: s.id,
        timeLabel: `${String(h).padStart(2, "0")}:00`,
        hour: h,
        status: s.status as "DRAFT" | "PUBLISHED" | "BOOKED",
      };
    });

    // Merge: echte wint van virtueel (zelfde uur)
    const byHour = new Map<number, typeof real[0]>();
    for (const v of virtual) byHour.set(v.hour, v as any);
    for (const r of real) byHour.set(r.hour, r);

    const slots = Array.from(byHour.values()).sort((a, b) => a.hour - b.hour);

    const diag = {
      partnerParam: q.partner,
      resolvedPartnerId: partner.id,
      day: q.day,
      baseTimes,
      occupiedHours: Array.from(occupied.values()).sort((a, b) => a - b),
      realAllCount: realAll.length,
      returnedSlotsCount: slots.length,
    };

    // Server log voor snelle zichtbaarheid
    console.log("[/api/slots/day][GET] diag:", diag);

    const res = NextResponse.json({ ok: true, slots, diag });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[/api/slots/day][GET] error:", err, "parsed:", parsed);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const input = PostSchema.parse(body);

    const partner = await resolvePartnerForRequest(user, input.partner);

    const start = toDateLocal(input.day, input.hour, 0);
    const end = toDateLocal(input.day, input.hour + 1, 0);

    if (input.action === "publish") {
      const existing = await prisma.slot.findFirst({
        where: { partnerId: partner.id, startTime: { gte: start, lt: end } },
        select: { id: true, status: true },
      });

      if (existing) {
        if (existing.status === "BOOKED") {
          return NextResponse.json({ ok: false, error: "ALREADY_BOOKED" }, { status: 409 });
        }
        await prisma.slot.update({
          where: { id: existing.id },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      } else {
        await prisma.slot.create({
          data: {
            partnerId: partner.id,
            startTime: start,
            endTime: end,
            status: "PUBLISHED",
            capacity: 1,
            maxPlayers: 3,
            publishedAt: new Date(),
          },
        });
      }
      return NextResponse.json({ ok: true });
    }

    // UNPUBLISH
    const existing = await prisma.slot.findFirst({
      where: { partnerId: partner.id, startTime: { gte: start, lt: end } },
      select: { id: true, status: true },
    });

    if (!existing) return NextResponse.json({ ok: true }); // niets te doen
    if (existing.status === "BOOKED") {
      return NextResponse.json({ ok: false, error: "ALREADY_BOOKED" }, { status: 409 });
    }

    await prisma.slot.update({
      where: { id: existing.id },
      data: { status: "DRAFT" }, // of delete als je dat liever hebt
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/slots/day][POST] error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 400 });
  }
}
