// PATH: src/app/api/auth/login/request/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "node:crypto";
import { sendTemplateMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function POST(req: Request) {
  const { email } = await req.json();
  const code = String(Math.floor(100000 + Math.random() * 900000));

  await prisma.loginCode.create({
    data: {
      email,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // ✅ API verstuurt niet zelf HTML: alleen template aanroepen
  await sendTemplateMail({
    to: email,
    template: "login-code",
    vars: { email, code },
  });

  return NextResponse.json({ ok: true });
}
