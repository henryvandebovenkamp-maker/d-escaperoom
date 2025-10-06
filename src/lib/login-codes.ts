// PATH: src/lib/login-codes.ts
import crypto from "node:crypto";
import prisma from "@/lib/prisma";

const TTL_MIN = Number(process.env.LOGIN_CODE_TTL_MINUTES ?? 10);

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function make6Digit(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createLoginCode(email: string) {
  const code = make6Digit();
  await prisma.loginCode.create({
    data: {
      email,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + TTL_MIN * 60_000),
    },
  });
  return code; // stuur per e-mail; voor dev kun je loggen
}

export async function verifyAndConsume(email: string, code: string) {
  const now = new Date();
  const hash = sha256(code);
  const row = await prisma.loginCode.findFirst({
    where: {
      email,
      codeHash: hash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return false;

  await prisma.loginCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}
