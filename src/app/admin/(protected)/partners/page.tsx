// PATH: src/app/admin/(protected)/partners/page.tsx
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import PartnersClient from "./PartnersClient"; // ✅ relatieve import

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") redirect("/admin/login");

  // Let op: googleMapsUrl NIET selecteren zolang Prisma Client het veld nog niet kent
  const initial = await prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      city: true,
      province: true,
      isActive: true,
      feePercent: true,
      price1PaxCents: true,
      price2PlusCents: true,
      heroImageUrl: true,
      addressLine1: true,
      postalCode: true,
      country: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
      // googleMapsUrl: true, // ⬅️ tijdelijk uitgeschakeld
    },
  });

  return (
    <PartnersClient
      initialPartners={initial.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        googleMapsUrl: null, // expliciet toevoegen zodat PartnerRow type klopt
        // googleMapsUrl niet mappen; PartnerRow heeft 'googleMapsUrl?: string | null'
      }))}
    />
  );
}
