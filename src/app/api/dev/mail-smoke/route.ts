// PATH: src/app/api/dev/mail-smoke/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { sendMail } from "@/lib/mail";

function assertAllowed(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const token = req.headers.get("x-dev-mail-token");
  if (!isDev && token !== process.env.DEV_MAIL_TOKEN) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function GET(req: NextRequest) {
  try {
    assertAllowed(req);
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("to");
    if (!to) return Response.json({ error: "to is required" }, { status: 400 });

    const html = `<p>SMTP smoke test ✔️</p><p>${new Date().toISOString()}</p>`;
    await sendMail({ to, subject: "D-EscapeRoom SMTP smoke", html, text: "SMTP smoke test" });

    return Response.json({ ok: true, to });
  } catch (err: any) {
    console.error("[mail-smoke] error:", err);
    if (err instanceof Response) return err;
    return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
