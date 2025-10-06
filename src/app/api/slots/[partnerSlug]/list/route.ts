// PATH: src/app/api/slots/[partnerSlug]/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QuerySchema = z.object({
  scope: z.enum(["day", "month"]).optional(),
  mode: z.enum(["day", "month"]).optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  base: z.coerce.number().int().min(1).max(48).optional(),
});

const TIMES_12 = [
  "09:00","10:00","11:00","12:00","13:00","14:00",
  "15:00","16:00","17:00","18:00","19:00","20:00",
] as const;

function parseQuery(req: NextRequest) {
  const u = new URL(req.url);
  const raw = Object.fromEntries(u.searchParams.entries());
  const q = QuerySchema.parse(raw);
  return { ...q, scopeOrMode: q.scope ?? q.mode };
}

// ---- Date helpers (lokale tijd) ----
const toDate = (y: number, m1: number, d: number, hh = 0, mm = 0) =>
  new Date(y, m1 - 1, d, hh, mm, 0, 0);
const startOfDayISO = (iso: string) => { const [y,m,d]=iso.split("-").map(Number); return toDate(y!,m!,d!,0,0); };
const endOfDayISO   = (iso: string) => { const [y,m,d]=iso.split("-").map(Number); return toDate(y!,m!,d!,23,59); };
const startOfMonthISO = (ym: string) => { const [y,m]=ym.split("-").map(Number); return toDate(y!,m!,1,0,0); };
const endOfMonthISO   = (ym: string) => { const [y,m]=ym.split("-").map(Number); return toDate(y!,m!+1,0,23,59); };
const combineDateTime = (dayISO: string, hhmm: string) => {
  const [y,m,d]=dayISO.split("-").map(Number); const [hh,mm]=hhmm.split(":").map(Number);
  return toDate(y!,m!,d!,hh!,mm!);
};
const addMinutes = (d: Date, mins: number) => new Date(d.getTime() + mins * 60_000);
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

type EffStatus = "DRAFT" | "PUBLISHED" | "BOOKED";
const effectiveStatus = (dbStatus: "DRAFT"|"PUBLISHED"|"BOOKED", hasConfirmed: boolean): EffStatus => {
  if (hasConfirmed) return "BOOKED";                               // alleen confirmed => BOOKED
  if (dbStatus === "PUBLISHED" || dbStatus === "BOOKED") return "PUBLISHED"; // DB BOOKED negeren zonder confirmed
  return "DRAFT";
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { partnerSlug } = await ctx.params;
    const q = parseQuery(req);
    const scope = q.scopeOrMode as "day" | "month" | undefined;
    const BASE = q.base ?? 12;

    // ===== MONTH (confirmed-only) =====
    if (scope !== "day") {
      if (!q.month) return NextResponse.json({ error: "Missing 'month' (YYYY-MM)" }, { status: 400 });
      const from = startOfMonthISO(q.month);
      const to   = endOfMonthISO(q.month);

      const whereSlots: any = { startTime: { gte: from, lte: to } };
      if (user.role === "PARTNER") {
        const partner = await resolvePartnerForRequest(user, partnerSlug);
        whereSlots.partnerId = partner.id;
      } else if (user.role === "ADMIN" && partnerSlug !== "all") {
        whereSlots.partner = { slug: partnerSlug };
      }

      const monthSlots = await prisma.slot.findMany({
        where: whereSlots,
        orderBy: { startTime: "asc" },
        select: {
          startTime: true,
          status: true,
          // ⚠️ enkelvoudige relatie
          booking: { select: { status: true } },
        },
      });

      // seed maand
      const daysInMonth = (() => {
        const [y, m] = q.month!.split("-").map(Number);
        const last = new Date(y!, m!, 0).getDate();
        return Array.from({ length: last }, (_, i) => `${y}-${String(m).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
      })();

      const byDay: Record<string, { day: string; PUBLISHED: number; BOOKED: number; DRAFT: number }> = {};
      for (const d of daysInMonth) byDay[d] = { day: d, PUBLISHED: 0, BOOKED: 0, DRAFT: BASE };

      for (const s of monthSlots) {
        const key = dayKey(new Date(s.startTime));
        if (!byDay[key]) continue;
        const hasConfirmed = s.booking?.status === "CONFIRMED";
        const eff = effectiveStatus(s.status as EffStatus, hasConfirmed);
        if (eff === "BOOKED") byDay[key].BOOKED++;
        else if (eff === "PUBLISHED") byDay[key].PUBLISHED++;
        if (eff !== "DRAFT") byDay[key].DRAFT = Math.max(0, byDay[key].DRAFT - 1);
      }

      const days = Object.values(byDay).sort((a,b)=>a.day.localeCompare(b.day));
      const res = NextResponse.json({
        ok: true,
        scope: "month",
        month: q.month,
        base: BASE,
        days,
        publishedDays: days.map(d => ({ date: d.day, publishedCount: d.PUBLISHED })),
      });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // ===== DAY (confirmed-only; DB BOOKED genegeerd) =====
    if (!q.day) return NextResponse.json({ error: "Missing 'day' (YYYY-MM-DD)" }, { status: 400 });

    if (user.role === "ADMIN" && partnerSlug === "all") {
      const baseTimes = (TIMES_12 as readonly string[]).slice(0, BASE);
      const res = NextResponse.json({
        ok: true,
        scope: "day",
        day: q.day,
        needsPartner: true,
        counts: { DRAFT: baseTimes.length, PUBLISHED: 0, BOOKED: 0 },
        slots: [],
        list: [],
        items: [],
      });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const partner = await resolvePartnerForRequest(user, partnerSlug);
    const from = startOfDayISO(q.day);
    const to   = endOfDayISO(q.day);

    const realAll = await prisma.slot.findMany({
      where: { partnerId: partner.id, startTime: { gte: from, lte: to } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        capacity: true,
        maxPlayers: true,
        // ⚠️ enkelvoudige relatie
        booking: { select: { id: true, status: true } },
      },
    });

    // items: effectieve status afgeleid van confirmed-only
    const items = realAll.map((s) => {
      const hasConfirmed = s.booking?.status === "CONFIRMED";
      const eff = effectiveStatus(s.status as EffStatus, hasConfirmed);
      return {
        id: s.id,
        startTime: new Date(s.startTime).toISOString(),
        endTime: s.endTime ? new Date(s.endTime).toISOString() : undefined,
        status: eff,
        capacity: s.capacity ?? null,
        maxPlayers: s.maxPlayers ?? null,
        virtual: false,
      };
    });

    // Virtuele DRAFT-grid
    const baseTimes = (TIMES_12 as readonly string[]).slice(0, BASE);

    // een echt slot (ongeacht status) blokkeert een virtuele tick
    const occupiedHHMM = new Set<string>(
      realAll.map((s) => {
        const d = new Date(s.startTime);
        return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
      })
    );

    const virtualDrafts = baseTimes
      .filter(t => !occupiedHHMM.has(t))
      .map((t) => {
        const start = combineDateTime(q.day!, t);
        return {
          id: null as string | null,
          startTime: start.toISOString(),
          endTime: addMinutes(start, 60).toISOString(),
          status: "DRAFT" as const,
          capacity: 1,
          maxPlayers: 3,
          virtual: true,
          timeLabel: t,
        };
      });

    // boekbare echte slots = effStatus === PUBLISHED
    const publishedBookable = realAll
      .map((s) => {
        const hasConfirmed = s.booking?.status === "CONFIRMED";
        const eff = effectiveStatus(s.status as EffStatus, hasConfirmed);
        if (eff !== "PUBLISHED") return null;
        const d = new Date(s.startTime);
        return {
          id: s.id,
          startTime: d.toISOString(),
          endTime: s.endTime ? new Date(s.endTime).toISOString() : null,
          status: "PUBLISHED" as const,
          capacity: s.capacity ?? null,
          maxPlayers: s.maxPlayers ?? null,
          virtual: false,
          timeLabel: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
        };
      })
      .filter(Boolean) as Array<{
        id: string; startTime: string; endTime: string|null; status: "PUBLISHED";
        capacity: number|null; maxPlayers: number|null; virtual: false; timeLabel: string;
      }>;

    const slots = [...virtualDrafts, ...publishedBookable]
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));

    // Counts op basis van effectieve status
    const publishedCount = items.filter(x => x.status === "PUBLISHED").length;
    const bookedCount    = items.filter(x => x.status === "BOOKED").length;
    const draftCount     = Math.max(0, baseTimes.length - (publishedCount + bookedCount));

    const res = NextResponse.json({
      ok: true,
      scope: "day",
      day: q.day,
      counts: { DRAFT: draftCount, PUBLISHED: publishedCount, BOOKED: bookedCount },
      slots,
      list: slots, // compat
      items,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/list] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
