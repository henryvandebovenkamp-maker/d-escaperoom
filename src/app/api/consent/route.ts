// PATH: src/app/api/consent/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "node:crypto";

export async function POST(req: Request) {
  try {
    const { version, locale, preferences } = await req.json();

    // Headers (XFF voor proxy/Vercel)
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    const userAgent = req.headers.get("user-agent") || undefined;
    const referer = req.headers.get("referer") || undefined;

    // Hash ipv plain IP (bewijsbaar zonder extra persoonsgegevens)
    const ipHash =
      ip && ip !== "0.0.0.0"
        ? crypto.createHash("sha256").update(ip).digest("hex")
        : null;

    await prisma.consentLog.create({
      data: {
        version: String(version || "unknown"),
        locale: locale || "nl",
        preferences,
        ipHash: ipHash || undefined,
        userAgent,
        referer,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}
