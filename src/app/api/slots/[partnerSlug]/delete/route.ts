import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";

/** Body: { ids: string[] } */
const BodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    // 1) Auth
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Params (Next.js 15: await ctx.params)
    const { partnerSlug } = await ctx.params;
    if (!partnerSlug) {
      return NextResponse.json({ error: "Missing partnerSlug" }, { status: 400 });
    }

    // 3) Partner-resolutie (partner = eigen, admin = via slug)
    const partner = await resolvePartnerForRequest(user, partnerSlug);

    // 4) Body validatie
    const body = await req.json();
    const { ids } = BodySchema.parse(body);

    // 5) Bepaal welke ids we mogen verwijderen:
    //    - moeten bij deze partner horen
    //    - status NIET 'BOOKED' (die slaan we over)
    //    NB: we accepteren zowel DRAFT als PUBLISHED om flexibel te zijn.
    //        In jouw UI gebruik je dit nu voor PUBLISHED.
    const deletable = await prisma.slot.findMany({
      where: {
        id: { in: ids },
        partnerId: partner.id,
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
      select: { id: true },
    });

    const deletableIds = deletable.map((s) => s.id);
    const skippedIds = ids.filter((id) => !deletableIds.includes(id));

    // 6) Verwijder in bulk
    let deletedCount = 0;
    if (deletableIds.length > 0) {
      const res = await prisma.slot.deleteMany({
        where: { id: { in: deletableIds }, partnerId: partner.id },
      });
      deletedCount = res.count;
    }

    return NextResponse.json({
      ok: true,
      deletedCount,
      skippedIds, // bevat o.a. BOOKED of niet-van-deze-partner ids
    });
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/delete] Error:", err);
    const msg =
      err?.message && typeof err.message === "string"
        ? err.message
        : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
