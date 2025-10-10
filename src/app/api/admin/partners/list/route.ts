// PATH: src/app/api/admin/partners/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const u = await getSessionUser();
    if (!u || u.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const where =
      q.length > 0
        ? {
            OR: [
              { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { slug: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { city: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : undefined;

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
        // addressLine2: verwijderd
        postalCode: true,
        country: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        googleMapsUrl: true, // ✅ nieuw veld
      },
    });

    // Serialize dates to ISO strings to match client-side types
    const serialized = items.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      googleMapsUrl: p.googleMapsUrl ?? null,
    }));

    return NextResponse.json({ ok: true, items: serialized }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "List failed" },
      { status: 400 }
    );
  }
}
