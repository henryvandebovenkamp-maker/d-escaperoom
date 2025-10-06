import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      // TIP: voeg filters toe als je velden hebt:
      // where: { isPublic: true, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, city: true },
    });

    return NextResponse.json(partners, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error("[/api/public/partners] error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
