import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/authz";

const Body = z.object({
  slotIds: z.array(z.string().min(1)).min(1),
  status: z.enum(["PUBLISHED","DRAFT"]),
});

export async function POST(req: Request) {
  const parse = Body.safeParse(await req.json());
  if (!parse.success) return new NextResponse("Bad Request", { status: 400 });
  const { slotIds, status } = parse.data;

  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // haal slot + partner-slug op om partner-toegang te controleren
  const slots = await prisma.slot.findMany({
    where: { id: { in: slotIds } },
    select: { id: true, status: true, partner: { select: { slug: true } } },
  });
  if (!slots.length) return NextResponse.json({ ok: true });

  // PARTNER mag alleen zijn eigen slots; ADMIN alles
  const partnerSlug = slots[0].partner.slug;
  if (user.role !== "ADMIN" && user.partnerSlug !== partnerSlug) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // BOOKED mag je niet downgraden
  const eligibleIds = slots.filter(s => s.status !== "BOOKED").map(s => s.id);
  if (!eligibleIds.length) return NextResponse.json({ ok: true });

  await prisma.slot.updateMany({
    where: { id: { in: eligibleIds } },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, updated: eligibleIds.length });
}
