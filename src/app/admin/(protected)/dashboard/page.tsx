// PATH: src/app/admin/(protected)/dashboard/page.tsx
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

/* ========= Helpers ========= */
const euro = (cents?: number | null) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" })
    .format((cents ?? 0) / 100);

function playersEmoji(n?: number | null) {
  const c = Math.max(0, Math.min(3, n ?? 0));
  if (c <= 1) return "👤 1";
  if (c === 2) return "👥 2";
  return "👤👤👤 3";
}

function StatCard({
  title,
  value,
  hint,
  icon,
  accent = "from-pink-600/10 to-rose-600/10",
  href,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg bg-gradient-to-r ${accent} px-2 py-1 text-base leading-none`}>
          {icon}
        </div>
        <h3 className="text-xs font-medium text-stone-600">{title}</h3>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums leading-none">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-stone-600">{hint}</p>}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-xl transition hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

/* ========= Page ========= */
export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    partnersActive,
    bookingsTotalConfirmed,
    bookingsTodayConfirmed,
    bookableSlots,
    feeTotalAgg,
    feeMonthAgg,
    discountTotalAgg,
    partnerRevenueTotalAgg,
    partnerRevenueMonthAgg,
    recentBookings,
  ] = await prisma.$transaction([
    prisma.partner.count({ where: { isActive: true } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        slot: { startTime: { gte: startOfToday, lt: endOfToday } },
      },
    }),
    prisma.slot.count({ where: { status: "PUBLISHED", startTime: { gte: now } } }),
    prisma.booking.aggregate({
      _sum: { depositAmountCents: true },
      where: { status: "CONFIRMED" },
    }),
    prisma.booking.aggregate({
      _sum: { depositAmountCents: true },
      where: {
        status: "CONFIRMED",
        slot: { startTime: { gte: startOfMonth, lte: now } },
      },
    }),
    prisma.booking.aggregate({
      _sum: { discountAmountCents: true },
      where: { status: "CONFIRMED" },
    }),
    prisma.booking.aggregate({
      _sum: { restAmountCents: true }, // omzet hondenscholen
      where: { status: "CONFIRMED" },
    }),
    prisma.booking.aggregate({
      _sum: { restAmountCents: true },
      where: {
        status: "CONFIRMED",
        slot: { startTime: { gte: startOfMonth, lte: now } },
      },
    }),
    prisma.booking.findMany({
      where: { status: "CONFIRMED" },
      select: {
        id: true,
        depositAmountCents: true,
        playersCount: true,
        dogName: true,
        customer: { select: { name: true } },
        slot: { select: { startTime: true } },
      },
      orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  const feeTotal = feeTotalAgg._sum.depositAmountCents ?? 0;
  const feeMonth = feeMonthAgg._sum.depositAmountCents ?? 0;
  const discountTotal = discountTotalAgg._sum.discountAmountCents ?? 0;
  const partnerRevenueTotal = partnerRevenueTotalAgg._sum.restAmountCents ?? 0;
  const partnerRevenueMonth = partnerRevenueMonthAgg._sum.restAmountCents ?? 0;

  return (
    <div className="space-y-6">
      {/* Compact header */}
      <header className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="mt-0.5 text-sm text-stone-700">
              Overzicht: boekingen, slots, fee-omzet, korting, partners en omzet bij hondenscholen.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-xs text-stone-700 border border-stone-200">
            ✅ Ingelogd als <b className="font-semibold">{user.email}</b>
          </span>
        </div>
      </header>

      {/* Stat grid — max 3 naast elkaar */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Boekingen (totaal)"
          value={bookingsTotalConfirmed}
          hint={`Vandaag: ${bookingsTodayConfirmed}`}
          icon="🧾"
          href="/admin/agenda"
        />
        <StatCard
          title="Boekbare slots"
          value={bookableSlots}
          hint="Gepland & gepubliceerd"
          icon="🎯"
          href="/admin/slots"
        />
        <StatCard
          title="Totaal omzet (fee)"
          value={euro(feeTotal)}
          hint={`Deze maand: ${euro(feeMonth)}`}
          icon="💶"
          href="/admin/revenue"
        />
        <StatCard
          title="Totaal korting"
          value={euro(discountTotal)}
          hint="Op bevestigde boekingen"
          icon="🏷️"
          href="/admin/revenue"
        />
        <StatCard
          title="Partners"
          value={partnersActive}
          hint="Actief op het platform"
          icon="🤝"
          href="/admin/partners"
        />
        <StatCard
          title="Omzet hondenscholen"
          value={euro(partnerRevenueTotal)}
          hint={`Deze maand: ${euro(partnerRevenueMonth)}`}
          icon="🐾"
          accent="from-emerald-500/10 to-emerald-600/10"
          href="/admin/revenue"
        />
      </section>

      {/* Acties + recente boekingen */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Snelle acties (2 kolommen breed) */}
        <div className="md:col-span-2 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-bold tracking-tight">Snelle acties</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link href="/admin/slots" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 transition">
              📅 Slots
            </Link>
            <Link href="/admin/partners" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 transition">
              🧭 Partners
            </Link>
            <Link href="/admin/agenda" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 transition">
              🗓️ Agenda
            </Link>
            <Link href="/admin/revenue" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 transition">
              📈 Omzet
            </Link>
          </div>
        </div>

        {/* Recente boekingen — 👤 klant • 🐶 hond • 👥 spelers */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-bold tracking-tight">Recente boekingen</h2>
          <ol className="mt-3 divide-y divide-stone-200">
            {recentBookings.length === 0 ? (
              <p className="text-xs text-stone-600">Nog geen bevestigde boekingen.</p>
            ) : (
              recentBookings.map((b) => (
                <li key={b.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      👤 {b.customer?.name ?? "Onbekende klant"}
                    </p>
                    <p className="text-[11px] text-stone-700 truncate">
                      🐶 {b.dogName ?? "—"} <span className="mx-1">•</span> {playersEmoji(b.playersCount)}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {b.slot?.startTime
                        ? new Date(b.slot.startTime).toLocaleString("nl-NL", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="text-xs font-semibold whitespace-nowrap">
                    {euro(b.depositAmountCents)}
                  </div>
                </li>
              ))
            )}
          </ol>
          <div className="mt-2 text-right">
            <Link
              href="/admin/agenda"
              className="text-xs font-medium text-rose-700 hover:underline"
            >
              Volledige agenda →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
