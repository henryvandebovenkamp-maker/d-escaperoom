// PATH: src/app/api/slots/series/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";

const BodySchema = z.object({
  partnerSlug: z.string().optional(),     // ADMIN levert dit aan
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  publish: z.boolean().optional(),
});

const FIRST_HOUR = 9;
const LAST_HOUR = 20;

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const body = BodySchema.parse(await req.json());

    const partner = await resolvePartnerForRequest(user, body.partnerSlug);
    const weekdays = body.weekdays ?? [1,2,3,4,5,6,0];

    const toUTC = (iso: string) => {
      const [y,m,d] = iso.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    };

    const start = toUTC(body.startDate);
    const end = toUTC(body.endDate);

    let created = 0, skippedExisting = 0;

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const day = new Date(t);
      if (!weekdays.includes(day.getUTCDay())) continue;

      for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
        const startTime = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, 0, 0));
        const endTime = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h + 1, 0, 0));

        const exists = await prisma.slot.findFirst({
          where: { partnerId: partner.id, startTime },
          select: { id: true },
        });
        if (exists) { skippedExisting++; continue; }

        await prisma.slot.create({
          data: {
            partnerId: partner.id,
            startTime,
            endTime,
            status: body.publish ? "PUBLISHED" : "DRAFT",
            capacity: 1,
            maxPlayers: 3,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, skippedExisting });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 400 }
    );
  }
}
