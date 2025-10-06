// PATH: src/app/api/admin/partners/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = await prisma.partner.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, slug: true, email: true, phone: true,
      city: true, province: true, isActive: true, feePercent: true,
      price1PaxCents: true, price2PlusCents: true, heroImageUrl: true,
      addressLine1: true, addressLine2: true, postalCode: true,
      country: true, timezone: true, createdAt: true, updatedAt: true,
    },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: p });
}
