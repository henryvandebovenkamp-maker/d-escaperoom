import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import DiscountsPageClient from "@/components/discounts/DiscountsPageClient";

export const dynamic = "force-dynamic";

/* ========= Inline auth zoals dashboard ========= */
async function requirePartner() {
  const user = await getSessionUser();
  if (!user || user.role !== "PARTNER" || !user.partnerId) redirect("/partner/login");

  const partner = await prisma.partner.findUnique({
    where: { id: user.partnerId },
    select: { id: true, name: true, slug: true, city: true, province: true },
  });
  if (!partner) redirect("/partner/login");

  return { user, partner };
}

/* ========= Page ========= */
export default async function PartnerDiscountsPage() {
  const { user, partner } = await requirePartner();

  // KPI’s voor boven de lijst (optioneel, licht en snel houden)
  const [total, active, percentCount, fixedCount] = await Promise.all([
    prisma.discountCode.count({ where: { partnerId: partner.id } }),
    prisma.discountCode.count({ where: { partnerId: partner.id, active: true } }),
    prisma.discountCode.count({ where: { partnerId: partner.id, type: "PERCENT" } }),
    prisma.discountCode.count({ where: { partnerId: partner.id, type: "FIXED" } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header — identiek aan dashboard header */}
      <header className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Kortingen & acties</h1>
            <p className="mt-0.5 text-sm text-stone-700">
              Voor <b className="font-semibold">{partner.name}</b>. Beheer je kortingscodes (max 20% bij percentage).
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-xs text-stone-700 border border-stone-200">
            ✅ Ingelogd als <b className="font-semibold">{user.email}</b>
          </span>
        </div>
      </header>

      <DiscountsPageClient
        mode="PARTNER"
        partners={[{ id: partner.id, name: partner.name, slug: partner.slug, city: partner.city }]}
        currentPartnerId={partner.id}
        // KPI seed zodat de client direct iets kan tonen (wordt live ververst bij fetch)
      />
    </div>
  );
}
