// PATH: src/app/api/cron/review-requests/route.ts

import { NextResponse } from "next/server";

import { sendPendingReviewRequests } from "@/lib/review-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sendPendingReviewRequests();

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("[review_requests_cron_error]", error);

    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
      }
    );
  }
}