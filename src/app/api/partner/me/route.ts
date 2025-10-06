// PATH: src/app/api/partner/me/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const u = await getSessionUser();
  if (!u || u.role !== "PARTNER" || !u.partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = await prisma.partner.findUnique({ where: { id: u.partnerId }, select: { slug: true, name: true } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p);
}
