// PATH: src/app/api/partners/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin: alle partners (voor admin screens)
  if (u.role === "ADMIN") {
    const rows = await prisma.partner.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, slug: true, city: true },
    });
    return NextResponse.json(rows);
  }

  // Partner: alléén eigen partner teruggeven
  if (u.role === "PARTNER" && u.partnerId) {
    const p = await prisma.partner.findUnique({
      where: { id: u.partnerId },
      select: { id: true, name: true, slug: true, city: true },
    });
    // Als er (nog) geen partner record is gekoppeld
    return NextResponse.json(p ? [p] : []);
  }

  // Overige rollen krijgen niets
  return NextResponse.json([], { status: 200 });
}
