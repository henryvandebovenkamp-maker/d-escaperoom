// PATH: src/app/api/admin/partners/update/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  province: z.string(), // enum/string; casten we bij write
  city: z.string().optional(),
  isActive: z.boolean().default(true),
  feePercent: z.number().int().min(0).max(90),
  price1PaxCents: z.number().int().min(0),
  price2PlusCents: z.number().int().min(0),
  heroImageUrl: z.string().url().optional(),
  addressLine1: z.string().optional(),
  // addressLine2: verwijderd
  postalCode: z.string().optional(),
  country: z.string().optional(),
  googleMapsUrl: z.string().url().optional(), // ✅ nieuw veld
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
    const raw = await req.json();

    // Normalisatie vóór validatie
    raw.slug = slugify(raw.slug || raw.name || "");
    if (raw.email) raw.email = String(raw.email).toLowerCase().trim();
    if (typeof raw.googleMapsUrl === "string") {
      const trimmed = raw.googleMapsUrl.trim();
      raw.googleMapsUrl = trimmed.length ? trimmed : undefined; // lege string -> undefined
    }

    const input = schema.parse(raw);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Partner bijwerken
      const updated = await tx.partner.update({
        where: { id: input.id },
        data: {
          name: input.name,
          slug: input.slug,
          email: input.email ?? null,
          phone: input.phone ?? null,
          province: input.province as any,
          city: input.city ?? null,
          isActive: input.isActive,
          feePercent: input.feePercent,
          price1PaxCents: input.price1PaxCents,
          price2PlusCents: input.price2PlusCents,
          heroImageUrl: input.heroImageUrl ?? null,
          addressLine1: input.addressLine1 ?? null,
          // addressLine2: verwijderd
          postalCode: input.postalCode ?? null,
          country: input.country ?? "NL",
          googleMapsUrl: input.googleMapsUrl ?? null, // ✅ opslaan
          timezone: input.timezone ?? "Europe/Amsterdam",
        },
        select: { id: true, slug: true, email: true },
      });

      // 2) Optioneel: AppUser (PARTNER) upserten & koppelen
      let userLinked = false;
      if (input.email) {
        await tx.appUser.upsert({
          where: { email: input.email },
          update: { role: "PARTNER", partnerId: updated.id },
          create: { email: input.email, role: "PARTNER", partnerId: updated.id },
        });
        userLinked = true;
      }

      return { updated, userLinked };
    });

    return NextResponse.json(
      {
        ok: true,
        id: result.updated.id,
        slug: result.updated.slug,
        userLinked: result.userLinked,
      },
      { status: 200 }
    );
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
