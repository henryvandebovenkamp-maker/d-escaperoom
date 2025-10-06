// PATH: src/app/api/discounts/toggle/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";

const Body = z.object({
  id: z.string().cuid(),
  active: z.boolean(),
});

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = Body.safeParse(await req.json());
  if (!data.success) {
    return NextResponse.json({ error: "Invalid body", issues: data.error.format() }, { status: 400 });
  }

  // Role scoping: partner mag alleen eigen codes togglen
  const existing = await prisma.discountCode.findUnique({
    where: { id: data.data.id },
    select: { id: true, partnerId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "PARTNER" && existing.partnerId !== u.partnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.discountCode.update({
    where: { id: data.data.id },
    data: { active: data.data.active },
    select: { id: true, active: true },
  });

  return NextResponse.json({ ok: true, discount: updated });
}
