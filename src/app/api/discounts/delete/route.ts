// PATH: src/app/api/discounts/delete/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Alleen admin of eigenaar-partner mag verwijderen
    const code = await prisma.discountCode.findUnique({ where: { id }, select: { partnerId: true } });
    if (!code) return NextResponse.json({ ok: true }); // idempotent

    if (user.role !== "ADMIN" && user.partnerId !== code.partnerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.discountCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
