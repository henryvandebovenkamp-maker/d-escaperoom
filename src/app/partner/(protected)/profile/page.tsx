// PATH: src/app/partner/(protected)/profile/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

/* ================================
   Validators
================================ */
const ContactSchema = z.object({
  name: z.string().min(2, "Naam is te kort").max(120),
  email: z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  addressLine1: z.string().max(120).optional().or(z.literal("")),
  addressLine2: z.string().max(120).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  country: z.string().max(2).optional().or(z.literal("")),
  timezone: z.string().max(64).optional().or(z.literal("")),
});

const BrandingSchema = z.object({
  heroImageUrl: z.string().url("Voer een volledige URL in (https://...)").optional().or(z.literal("")),
});

/* ================================
   Auth helper (uniform met dashboard)
================================ */
async function requirePartner() {
  const user = await getSessionUser();
  if (!user || user.role !== "PARTNER" || !user.partnerId) redirect("/partner/login");

  // Volledige partner nodig (pagina toont veel velden)
  const partner = await prisma.partner.findUnique({ where: { id: user.partnerId } });
  if (!partner) redirect("/partner/login");

  return { user, partner };
}

/* ================================
   Server actions (return void)
================================ */
export async function updateContact(formData: FormData): Promise<void> {
  "use server";
  const { partner } = await requirePartner();

  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
    redirect(`/partner/profile?m=${msg}`);
  }

  const d = parsed.data;
  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      addressLine1: d.addressLine1 || null,
      addressLine2: d.addressLine2 || null,
      postalCode: d.postalCode || null,
      city: d.city || null,
      country: d.country || "NL",
      timezone: d.timezone || "Europe/Amsterdam",
    },
  });

  revalidatePath("/partner/profile");
  redirect("/partner/profile?m=Contactgegevens%20opgeslagen");
}

export async function updateBranding(formData: FormData): Promise<void> {
  "use server";
  const { partner } = await requirePartner();

  const parsed = BrandingSchema.safeParse({
    heroImageUrl: formData.get("heroImageUrl"),
  });

  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
    redirect(`/partner/profile?m=${msg}`);
  }

  const { heroImageUrl } = parsed.data;

  await prisma.partner.update({
    where: { id: partner.id },
    data: { heroImageUrl: heroImageUrl || null },
  });

  revalidatePath("/partner/profile");
  redirect("/partner/profile?m=Branding%20opgeslagen");
}

/* ================================
   Page
================================ */
export default async function PartnerProfilePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { user, partner } = await requirePartner();
  const msg = typeof searchParams?.m === "string" ? decodeURIComponent(searchParams.m) : null;

  // kleine helpers
  const euro = (cents: number) => `€ ${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header — zelfde look & feel als dashboard */}
      <header className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">🎛️ Partnerprofiel</h1>
            <p className="mt-0.5 text-sm text-stone-700">
              Beheer je gegevens voor <b className="font-semibold">{partner.name}</b>. Grijze velden zijn alleen-lezen.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-xs text-stone-700 border border-stone-200">
            ✅ Ingelogd als <b className="font-semibold">{user.email}</b>
          </span>
        </div>
      </header>

      {/* Flash */}
      {msg ? (
        <div className="mx-auto w-full max-w-6xl rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800">
          {msg}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-4">
        {/* KPI-style cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="text-2xl">👤</div>
            <div className="mt-2 text-xs uppercase tracking-wide text-stone-500">Hondenschool</div>
            <div className="text-base font-semibold text-stone-900">{partner.name}</div>
            <div className="mt-1 text-xs text-stone-500 break-all">
              ID: <span className="font-mono">{partner.id}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="text-2xl">💸</div>
            <div className="mt-2 text-xs uppercase tracking-wide text-stone-500">Aanbetaling</div>
            <div className="text-base font-semibold text-stone-900">{partner.feePercent}%</div>
            <div className="mt-1 text-xs text-stone-500">Wordt online afgerekend door spelers</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="text-2xl">📍</div>
            <div className="mt-2 text-xs uppercase tracking-wide text-stone-500">Locatie</div>
            <div className="text-base font-semibold text-stone-900">
              {partner.city ?? "—"}{partner.country ? `, ${partner.country}` : ""}
            </div>
            <div className="mt-1 text-xs text-stone-500">{partner.postalCode ?? ""}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="text-2xl">⏰</div>
            <div className="mt-2 text-xs uppercase tracking-wide text-stone-500">Tijdzone</div>
            <div className="text-base font-semibold text-stone-900">{partner.timezone || "Europe/Amsterdam"}</div>
            <div className="mt-1 text-xs text-stone-500">Voor agenda & e-mails</div>
          </div>
        </section>

        {/* Main grid */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Contact & Adres (bewerkbaar) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">📞 Contact & Adres</h2>
            <form action={updateContact} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-stone-700">Naam hondenschool</label>
                  <input
                    id="name" name="name" required defaultValue={partner.name}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-stone-700">E-mail</label>
                  <input id="email" name="email" type="email" defaultValue={partner.email ?? ""} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-stone-700">Telefoon</label>
                  <input id="phone" name="phone" defaultValue={partner.phone ?? ""} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-stone-700">Tijdzone</label>
                  <input id="timezone" name="timezone" defaultValue={partner.timezone ?? "Europe/Amsterdam"} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-stone-700">Adresregel 1</label>
                  <input id="addressLine1" name="addressLine1" defaultValue={partner.addressLine1 ?? ""} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-stone-700">Adresregel 2</label>
                  <input id="addressLine2" name="addressLine2" defaultValue={partner.addressLine2 ?? ""} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-stone-700">Postcode</label>
                  <input id="postalCode" name="postalCode" defaultValue={partner.postalCode ?? ""} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-stone-700">Plaats</label>
                  <input id="city" name="city" defaultValue={partner.city ?? ""} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-stone-700">Land (ISO)</label>
                  <input id="country" name="country" placeholder="NL" defaultValue={partner.country ?? "NL"} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                </div>
              </div>

              <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-stone-50 text-sm font-medium shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/30">
                Opslaan
              </button>
            </form>
          </div>

          {/* Branding (bewerkbaar) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">🎨 Branding</h2>
            <form action={updateBranding} className="space-y-4">
              <div>
                <label htmlFor="heroImageUrl" className="block text-sm font-medium text-stone-700">Hero-afbeelding URL</label>
                <input
                  id="heroImageUrl" name="heroImageUrl" type="url"
                  placeholder="https://jouw-domein.nl/hero.jpg"
                  defaultValue={partner.heroImageUrl ?? ""}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                />
                <p className="mt-1 text-xs text-stone-500">Aanbevolen 1920×1080. Leeg laten = verwijderen.</p>
              </div>
              <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-stone-50 text-sm font-medium shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/30">
                Opslaan
              </button>
            </form>

            {partner.heroImageUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partner.heroImageUrl} alt="Hero voorbeeld" className="h-40 w-full object-cover" />
              </div>
            ) : null}
          </div>

          {/* Prijzen (alleen-lezen) */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-stone-800">🏷️ Prijzen (alleen-lezen)</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="text-sm text-stone-600">1 persoon</div>
                <div className="mt-1 text-lg font-semibold text-stone-900">{euro(partner.price1PaxCents)}</div>
                <div className="mt-1 text-xs text-stone-500">Basisprijs (inclusief eventuele toeslagen in checkout-logica)</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="text-sm text-stone-600">Vanaf 2 personen (per persoon)</div>
                <div className="mt-1 text-lg font-semibold text-stone-900">{euro(partner.price2PlusCents)}</div>
                <div className="mt-1 text-xs text-stone-500">Wordt vermenigvuldigd per speler</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="text-sm text-stone-600">Aanbetaling</div>
                <div className="mt-1 text-lg font-semibold text-stone-900">{partner.feePercent}%</div>
                <div className="mt-1 text-xs text-stone-500">Je speler betaalt dit deel nu; rest op locatie</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-stone-600">
              Wil je prijzen of aanbetalingspercentage aanpassen? Neem contact op met het platform (Admin) voor wijziging.
            </p>
          </div>

          {/* Systeeminfo (alleen-lezen) */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">🧩 Systeem</h2>
            <dl className="space-y-2 text-sm">
              <div className="grid grid-cols-3">
                <dt className="text-stone-600">Aangemaakt</dt>
                <dd className="col-span-2 text-stone-800">{new Date(partner.createdAt).toLocaleString("nl-NL")}</dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-stone-600">Laatst bijgewerkt</dt>
                <dd className="col-span-2 text-stone-800">{new Date(partner.updatedAt).toLocaleString("nl-NL")}</dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-stone-600">Slug</dt>
                <dd className="col-span-2 font-mono text-stone-900">{partner.slug}</dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-stone-600">Status</dt>
                <dd className="col-span-2">{partner.isActive ? "✅ Actief" : "⏸️ Gedeactiveerd"}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
