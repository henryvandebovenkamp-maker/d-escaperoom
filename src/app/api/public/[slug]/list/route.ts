// PATH: src/app/api/public/slots/[slug]/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const QSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige dag, gebruik YYYY-MM-DD"),
  includeDraft: z.enum(["0", "1"]).optional(),
});

function startOfDayLocalISO(dayISO: string) {
  // YYYY-MM-DDT00:00:00 in lokale tijd (zonder TZ verschuiving)
  return new Date(`${dayISO}T00:00:00`);
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Zorg dat Date -> string in JSON altijd ISO is
function toIsoString(d: Date) {
  return new Date(d).toISOString();
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const url = new URL(req.url);
    const parsed = QSchema.safeParse({
      day: url.searchParams.get("day") ?? "",
      includeDraft: url.searchParams.get("includeDraft") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ongeldige parameters" }, { status: 400 });
    }

    const { day, includeDraft } = parsed.data;
    const slug = params.slug;

    // 1) Partner opzoeken
    const partner = await prisma.partner.findUnique({
      where: { slug },
      select: { id: true /* , isActive: true */ },
    });
    if (!partner) {
      return NextResponse.json({ error: "Partner niet gevonden" }, { status: 404 });
    }

    // 2) Dag-bereik bepalen [start, end)
    const start = startOfDayLocalISO(day);
    const end = addDays(start, 1);

    // 3) Statusfilter
    const statuses = includeDraft === "1" ? ["DRAFT", "PUBLISHED", "BOOKED"] as const : ["PUBLISHED", "BOOKED"] as const;

    // 4) Slots ophalen
    const rows = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: { gte: start, lt: end },
        status: { in: statuses as any },
      },
      select: {
        id: true,
        startTime: true,
        status: true, // "DRAFT" | "PUBLISHED" | "BOOKED"
      },
      orderBy: { startTime: "asc" },
    });

    // 5) Normaliseren voor de client
    const items = rows.map((r) => ({
      id: r.id,
      startTime: toIsoString(r.startTime),
      status: r.status,
    }));

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Serverfout" }, { status: 500 });
  }
}
