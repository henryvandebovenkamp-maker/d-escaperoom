// PATH: src/app/api/discounts/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";

const Query = z.object({
  partnerId: z.string().cuid().optional(),  // Admin kan filteren; partner wordt geforceerd op zichzelf
  q: z.string().trim().optional(),          // optionele zoekterm op code
  active: z.enum(["all", "true", "false"]).optional(), // filter op active
});

export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = Query.safeParse({
    partnerId: url.searchParams.get("partnerId") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    active: url.searchParams.get("active") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.format() }, { status: 400 });
  }
  const { partnerId, q, active } = parsed.data;

  // Role scoping
  let where: any = {};
  if (u.role === "PARTNER") {
    where.partnerId = u.partnerId ?? "__NONE__"; // force eigen partner
  } else if (u.role === "ADMIN") {
    if (partnerId) where.partnerId = partnerId;
  }

  if (q) {
    where.code = { contains: q.toUpperCase() };
  }

  if (active === "true") where.active = true;
  if (active === "false") where.active = false;

  const items = await prisma.discountCode.findMany({
    where,
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      type: true,
      percent: true,
      amountCents: true,
      validFrom: true,
      validUntil: true,
      maxRedemptions: true,
      redeemedCount: true,
      active: true,
      partnerId: true,
      partner: { select: { id: true, name: true, slug: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}
