// PATH: src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const u = await getSessionUser();

  if (!u) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: u.id,
      email: u.email,
      role: u.role,
      partnerId: u.partnerId ?? null,
    },
  });
}
