// PATH: src/app/api/admin/partners/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const items = await prisma.partner.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      city: true,
      province: true,
      isActive: true,
      feePercent: true,
      price1PaxCents: true,
      price2PlusCents: true,
      heroImageUrl: true,
      addressLine1: true,
      addressLine2: true,
      postalCode: true,
      country: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ items });
}
