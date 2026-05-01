// PATH: src/app/api/discounts/create/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const emptyToUndef = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.any()
);

const coerceInt = (
  min?: number,
  minMsg?: string,
  max?: number,
  maxMsg?: string
) =>
  z.preprocess((v) => {
    if (v === "" || v === null || typeof v === "undefined") return undefined;

    const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
    return Number.isFinite(n) ? Math.trunc(Number(n)) : n;
  }, (() => {
    let s = z.number().int();

    if (typeof min === "number") {
      s = s.min(min, { message: minMsg ?? `Min ${min}` });
    }

    if (typeof max === "number") {
      s = s.max(max, { message: maxMsg ?? `Max ${max}` });
    }

    return s;
  })());

const dateFlexible = z.preprocess((v) => {
  if (v === "" || v === null || typeof v === "undefined") return undefined;
  if (v instanceof Date) return v;

  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return new Date(`${v}T00:00:00.000Z`);
    }

    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return v;
}, z.date().optional());

function zodIssues(err: z.ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
    code: i.code,
  }));
}

function normalizeCode(s: string) {
  return s
    .trim()
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const BaseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code is te kort (min 3)")
    .max(32, "Code is te lang (max 32)"),

  validFrom: emptyToUndef.pipe(dateFlexible),
  validUntil: emptyToUndef.pipe(dateFlexible),

  maxRedemptions: emptyToUndef.pipe(coerceInt(1, "Min 1")).optional(),

  partnerId: emptyToUndef.pipe(z.string().min(1, "Kies een hondenschool.")),
  partnerSlug: emptyToUndef.pipe(z.string().min(2)).optional(),
});

const PercentSchema = BaseSchema.extend({
  type: z.literal("PERCENT"),
  percent: emptyToUndef.pipe(coerceInt(1, "Min 1", 100, "Max 100")),
  amountCents: emptyToUndef.pipe(coerceInt(1)).optional(),
});

const FixedSchema = BaseSchema.extend({
  type: z.literal("FIXED"),
  amountCents: emptyToUndef.pipe(coerceInt(1, "Moet > 0 zijn")),
  percent: emptyToUndef.pipe(coerceInt(1, "Min 1", 100, "Max 100")).optional(),
});

const CreateSchema = z.discriminatedUnion("type", [
  PercentSchema,
  FixedSchema,
]);

export async function POST(req: Request) {
  const u = await getSessionUser();

  if (!u) {
    return json({ error: "Unauthorized" }, 401);
  }

  let raw: any;

  try {
    raw = await req.json();
  } catch {
    return json({ error: "Body ontbreekt of is geen JSON" }, 400);
  }

  const body: any = { ...raw };

  if (body.type === "AMOUNT") body.type = "FIXED";
  if (body.type === "PERCENTAGE") body.type = "PERCENT";

  if (!body.validUntil && body.validTo) {
    body.validUntil = body.validTo;
  }

  if (!body.maxRedemptions && (body.maxUses || body.maxUse)) {
    body.maxRedemptions = body.maxUses ?? body.maxUse;
  }

  if (!body.amountCents) {
    if (typeof body.valueCents !== "undefined") {
      body.amountCents = body.valueCents;
    } else if (typeof body.amountEuro !== "undefined") {
      const eur =
        typeof body.amountEuro === "string"
          ? Number(body.amountEuro.replace(",", "."))
          : Number(body.amountEuro);

      if (Number.isFinite(eur)) {
        body.amountCents = Math.round(eur * 100);
      }
    } else if (typeof body.amount !== "undefined") {
      const v =
        typeof body.amount === "string"
          ? Number(body.amount.replace(",", "."))
          : Number(body.amount);

      if (Number.isFinite(v)) {
        body.amountCents = v <= 1000 ? Math.round(v * 100) : Math.trunc(v);
      }
    }
  }

  if (!body.partnerId && body.partnerSlug) {
    const p = await prisma.partner.findUnique({
      where: { slug: body.partnerSlug },
      select: { id: true },
    });

    if (p) {
      body.partnerId = p.id;
    }
  }

  if (u.role === "PARTNER") {
    if (!u.partnerId) {
      return json({ error: "Partneraccount mist koppeling (partnerId)." }, 403);
    }

    body.partnerId = u.partnerId;
  }

  if (u.role !== "ADMIN" && u.role !== "PARTNER") {
    return json({ error: "Forbidden" }, 403);
  }

  const parsed = CreateSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error: "Invalid",
        issues: zodIssues(parsed.error),
      },
      400
    );
  }

  const dto = parsed.data;

  if (dto.validFrom && dto.validUntil && dto.validUntil < dto.validFrom) {
    return json({ error: "validUntil kan niet vóór validFrom liggen." }, 400);
  }

  const partner = await prisma.partner.findUnique({
    where: { id: dto.partnerId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!partner) {
    return json({ error: "Onbekende partnerId." }, 404);
  }

  const normalizedCode = normalizeCode(dto.code);

  if (!normalizedCode) {
    return json({ error: "Ongeldige code" }, 400);
  }

  try {
    const created = await prisma.discountCode.create({
      data: {
        code: normalizedCode,
        type: dto.type,
        percent: dto.type === "PERCENT" ? dto.percent : null,
        amountCents: dto.type === "FIXED" ? dto.amountCents : null,
        validFrom: dto.validFrom ?? null,
        validUntil: dto.validUntil ?? null,
        maxRedemptions: dto.maxRedemptions ?? null,
        partnerId: partner.id,
        createdByUserId: u.id ?? null,
        createdByRole: u.role as any,
        active: true,
      },
      select: {
        id: true,
        code: true,
        type: true,
        percent: true,
        amountCents: true,
        validFrom: true,
        validUntil: true,
        maxRedemptions: true,
        redeemedCount: true,
        active: true,
        partnerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return json(
      {
        ok: true,
        code: {
          ...created,
          partnerName: partner.name,
          partnerSlug: partner.slug,
        },
      },
      201
    );
  } catch (err: any) {
    if (err?.code === "P2002") {
      return json(
        { error: "Deze code bestaat al. Kies een andere code." },
        409
      );
    }

    console.error("discounts/create error", err);
    return json({ error: "Server error" }, 500);
  }
}