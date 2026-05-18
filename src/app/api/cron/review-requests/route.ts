// PATH: src/app/api/cron/review-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendPendingReviewRequests } from "@/lib/review-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel voegt automatisch Authorization: Bearer <CRON_SECRET> toe aan geplande cron-calls.
  // Als CRON_SECRET gezet is, weigeren we ongeautoriseerde aanroepen.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await sendPendingReviewRequests();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[review_requests_cron_error]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
