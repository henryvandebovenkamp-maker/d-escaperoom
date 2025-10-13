// PATH: src/app/api/auth/login/request/route.ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { sendTemplateMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

export async function POST(req: Request) {
  const { email } = await req.json();

  const code = genCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.loginCode.create({
    data: { email, codeHash: sha256(code), expiresAt },
  });

  const magicUrl = `${process.env.APP_ORIGIN || "https://d-escaperoom.vercel.app"}/partner/login?email=${encodeURIComponent(email)}&code=${code}`;

  await sendTemplateMail({
    to: email,
    template: "login_code",
    vars: { email, code, magicUrl },
  });

  return NextResponse.json({ ok: true });
}
