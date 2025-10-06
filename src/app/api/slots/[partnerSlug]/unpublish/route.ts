// PATH: src/app/api/slots/[partnerSlug]/unpublish/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";

// Let op: we gebruiken geen z.uuid() omdat je id mogelijk geen UUID is (cuid etc).
const BodySchema = z.object({
  slotId: z.string().min(6, "slotId is required"),
  // Als je i.p.v. verwijderen ooit wilt 'soft unpublishen', kun je dit op false zetten
  hardDelete: z.boolean().optional().default(true),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { partnerSlug } = await ctx.params;
    const partner = await resolvePartnerForRequest(user, partnerSlug);

    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const body = BodySchema.safeParse(bodyJson);
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }
    const { slotId, hardDelete } = body.data;

    // Haal slot op, maar alleen binnen deze partner
    const slot = await prisma.slot.findFirst({
      where: { id: slotId, partnerId: partner.id },
      select: { id: true, status: true },
    });
    if (!slot) {
      return NextResponse.json({ error: "Slot not found for this partner" }, { status: 404 });
    }

    // Boekingen beschermen: BOOKED mag je niet verwijderen/unpublishen
    if (slot.status === "BOOKED") {
      return NextResponse.json({ error: "Cannot unpublish/delete a booked slot" }, { status: 400 });
    }

    if (hardDelete) {
      await prisma.slot.delete({ where: { id: slot.id } });
      return NextResponse.json({ ok: true, action: "deleted", slotId: slot.id });
    } else {
      // Als je ooit 'DRAFT' in DB zou willen opslaan:
      // const updated = await prisma.slot.update({ where: { id: slot.id }, data: { status: "DRAFT" } });
      // return NextResponse.json({ ok: true, action: "unpublished", slot: updated });
      await prisma.slot.delete({ where: { id: slot.id } }); // DB houdt geen DRAFT aan → dus verwijderen
      return NextResponse.json({ ok: true, action: "deleted", slotId: slot.id });
    }
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/unpublish] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
