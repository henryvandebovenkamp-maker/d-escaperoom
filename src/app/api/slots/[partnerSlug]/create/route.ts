import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// ===== Zod: twee body-varianten =====
const BodyByDayTime = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // "2025-10-17"
  time: z.string().regex(/^\d{2}:\d{2}$/),        // "09:00"
  publish: z.boolean().optional().default(false),
});

const BodyByStartISO = z.object({
  startTime: z.string(),                           // "2025-10-17T09:00" of ISO
  publish: z.boolean().optional().default(false),
});

const BodySchema = z.union([BodyByDayTime, BodyByStartISO]);

// Helpers
function toUtcFromDayTime(dayISO: string, hhmm: string) {
  const [y, m, d] = dayISO.split("-").map((v) => parseInt(v, 10));
  const [hh, mm] = hhmm.split(":").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
}
function normalizeStartTime(input: string) {
  // Accepteer "YYYY-MM-DDTHH:MM" of volledige ISO. Forceer UTC interpretatie.
  // Strategy: als string geen 'Z' of offset bevat, behandelen als lokale klok en naar UTC casten.
  // Voor stabiliteit in je app: liever day+time gebruiken.
  const looksLikeShort = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input);
  if (looksLikeShort) {
    const [date, hm] = input.split("T");
    return toUtcFromDayTime(date, hm);
  }
  const d = new Date(input);
  return d;
}

export async function POST(
  req: Request,
  { params }: { params: { partnerSlug: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { partnerSlug } = params;
    if (!partnerSlug) return NextResponse.json({ error: "Missing partnerSlug" }, { status: 400 });

    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    // Role guard
    if (user.role === "PARTNER" && user.partnerId !== partner.id) {
      return NextResponse.json({ error: "Forbidden (wrong partner)" }, { status: 403 });
    }

    const bodyRaw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten() }, { status: 400 });
    }

    const publish = "publish" in parsed.data ? !!parsed.data.publish : false;
    const startTime =
      "day" in parsed.data
        ? toUtcFromDayTime(parsed.data.day, parsed.data.time)
        : normalizeStartTime(parsed.data.startTime);

    if (isNaN(startTime.getTime())) {
      return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
    }

    // Probeer te creëren
    try {
      const created = await prisma.slot.create({
        data: {
          partnerId: partner.id,
          startTime,
          endTime: startTime, // TODO: Replace with correct endTime if needed
          status: publish ? "PUBLISHED" : "DRAFT",
        },
        select: { id: true, startTime: true, status: true },
      });

      return NextResponse.json(
        {
          created: true,
          alreadyExisted: false,
          promotedFromDraft: 0,
          slot: {
            id: created.id,
            startTime: created.startTime.toISOString(),
            status: created.status,
          },
        },
        { status: 201 }
      );
    } catch (err: any) {
      // Waarschijnlijk P2002 (unique constraint)
      // Check bestaand slot en handel af
      const existing = await prisma.slot.findUnique({
        where: {
          partnerId_startTime: {
            partnerId: partner.id,
            startTime,
          },
        },
        select: { id: true, status: true, startTime: true },
      });

      if (!existing) {
        // Onbekende DB-fout
        console.error("create route error (createMany)", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }

      // Als publish=true en status is DRAFT → promoot naar PUBLISHED
      if (publish && existing.status === "DRAFT") {
        const res = await prisma.slot.update({
          where: { id: existing.id },
          data: { status: "PUBLISHED" },
          select: { id: true, status: true, startTime: true },
        });
        return NextResponse.json(
          {
            created: false,
            alreadyExisted: true,
            promotedFromDraft: 1,
            slot: {
              id: res.id,
              startTime: res.startTime.toISOString(),
              status: res.status,
            },
          },
          { status: 200 }
        );
      }

      // Bij BOOKED of al PUBLISHED (of publish=false): niets wijzigen
      return NextResponse.json(
        {
          created: false,
          alreadyExisted: true,
          promotedFromDraft: 0,
          slot: {
            id: existing.id,
            startTime: existing.startTime.toISOString(),
            status: existing.status,
          },
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error("create route error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
