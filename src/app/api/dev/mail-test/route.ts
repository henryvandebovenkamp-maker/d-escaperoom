// PATH: src/app/api/dev/mail-test/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySmtp } from "@/lib/mail";

export async function GET() {
  const result = await verifySmtp();
  return NextResponse.json(result);
}
