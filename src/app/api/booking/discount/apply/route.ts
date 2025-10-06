import { NextResponse } from "next/server";

/** Dun doorgeefluik zodat je fallback endpoint blijft werken */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const r = await fetch(new URL("/api/booking/apply-discount", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const json = await r.json();
    return NextResponse.json(json, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Proxy apply failed" }, { status: 500 });
  }
}
