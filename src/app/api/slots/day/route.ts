// PATH: src/app/api/slots/day/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { generateStartTimes } from "@/lib/slot-times";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      const res = NextResponse.json({ ok: true, needsPartner: true, slots: [], diag: { note: "Needs concrete partner slug." } });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // Resolve partner (valideert scope voor PARTNER en staat ADMIN toe om andere slugs te kiezen)
    const partnerBase = await resolvePartnerForRequest(user, q.partner);
    const partnerFull = await prisma.partner.findUnique({
      where: { id: partnerBase.id },
      select: { id: true, slotDurationMinutes: true },
    });
    const partner = partnerBase;
    const slotDurationMinutes = partnerFull?.slotDurationMinutes ?? 60;

    const { start, end } = startEndOfDay(q.day);

    // Alle echte slots (incl. BOOKED) van deze dag voor deze partner
    const realAll = await prisma.slot.findMany({
      where: { partnerId: partner.id, startTime: { gte: start, lte: end } },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, status: true },
    });

    // Bezette starttijden (HH:MM, Amsterdam-tijd)
    const occupiedLabels = new Set<string>(
      realAll.map(s => {
        const d = new Date(s.startTime);
        const h = d.getUTCHours();
        const m = d.getUTCMinutes();
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      })
    );

    const baseTimes = generateStartTimes(slotDurationMinutes);

    // Virtuele DRAFT-sleuven (niet op bezette starttijden)
    const virtual = baseTimes
      .filter(t => !occupiedLabels.has(t))
      .map(t => {
        const [h, m] = t.split(":").map(Number);
        return {
          id: `virtual-${q.day}-${t}`,
          timeLabel: t,
          hour: h,
          minute: m,
          status: "DRAFT" as const,
        };
      });

    // Echte slots
    const real = realAll.map(s => {
      const d = new Date(s.startTime);
      const h = d.getUTCHours();
      const m = d.getUTCMinutes();
      const timeLabel = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      return {
        id: s.id,
        timeLabel,
        hour: h,
        minute: m,
        status: s.status as "DRAFT" | "PUBLISHED" | "BOOKED",
      };
    });

    // Merge: echte wint van virtueel (zelfde starttijd)
    const byLabel = new Map<string, typeof real[0]>();
    for (const v of virtual) byLabel.set(v.timeLabel, v as any);
    for (const r of real) byLabel.set(r.timeLabel, r);

    const slots = Array.from(byLabel.values()).sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));

    const diag = {
      partnerParam: q.partner,
      resolvedPartnerId: partner.id,
      day: q.day,
      slotDurationMinutes,
      baseTimes,
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

    const partnerBase = await resolvePartnerForRequest(user, input.partner);
    const partnerFull = await prisma.partner.findUnique({
      where: { id: partnerBase.id },
      select: { id: true, slotDurationMinutes: true },
    });
    const partner = partnerBase;
    const slotDurationMinutes = partnerFull?.slotDurationMinutes ?? 60;

    const start = toDateLocal(input.day, input.hour, 0);
    const end = new Date(start.getTime() + slotDurationMinutes * 60_000);

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
