// PATH: src/app/api/admin/partners/create/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  province: z.string(),
  city: z.string().optional(),
  isActive: z.boolean().default(true),
  feePercent: z.number().int().min(0).max(90),
  price1PaxCents: z.number().int().min(0),
  price2PlusCents: z.number().int().min(0),
  heroImageUrl: z.string().url().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().default("Europe/Amsterdam"),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // slug/email normaliseren vóór validatie
    body.slug = slugify(body.slug || body.name || "");
    if (body.email) body.email = String(body.email).toLowerCase().trim();

    const input = schema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Partner aanmaken
      const partner = await tx.partner.create({
        data: {
          name: input.name,
          slug: input.slug,
          email: input.email,
          phone: input.phone,
          province: input.province as any, // enum of string in jouw schema
          city: input.city,
          isActive: input.isActive,
          feePercent: input.feePercent,
          price1PaxCents: input.price1PaxCents,
          price2PlusCents: input.price2PlusCents,
          heroImageUrl: input.heroImageUrl,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          postalCode: input.postalCode,
          country: input.country ?? "NL",
          timezone: input.timezone ?? "Europe/Amsterdam",
        },
        select: { id: true, slug: true, email: true },
      });

      // 2) Optioneel: AppUser (PARTNER) upserten & koppelen
      let userCreatedOrLinked = false;
      if (input.email) {
        await tx.appUser.upsert({
          where: { email: input.email }, // vereist unique index op AppUser.email
          update: { role: "PARTNER", partnerId: partner.id },
          create: { email: input.email, role: "PARTNER", partnerId: partner.id },
        });
        userCreatedOrLinked = true;
      }

      return { partner, userCreatedOrLinked };
    });

    return NextResponse.json({
      ok: true,
      id: result.partner.id,
      slug: result.partner.slug,
      userLinked: result.userCreatedOrLinked,
    });
  } catch (e: any) {
    // Prisma unieke index fout op slug
    if (e?.code === "P2002" && Array.isArray(e?.meta?.target) && e.meta.target.includes("slug")) {
      return NextResponse.json({ error: "Slug bestaat al" }, { status: 409 });
    }
    // Prisma unieke index fout op AppUser.email
    if (e?.code === "P2002" && Array.isArray(e?.meta?.target) && e.meta.target.includes("email")) {
      return NextResponse.json({ error: "Er bestaat al een gebruiker met dit e-mailadres" }, { status: 409 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues?.[0]?.message || "Validatiefout" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Onbekende fout" }, { status: 500 });
  }
}
