// PATH: src/app/admin/(protected)/dashboard/page.tsx
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const APP_TIME_ZONE = "Europe/Amsterdam";

const euro = (cents?: number | null) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format((cents ?? 0) / 100);

function getAmsterdamParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

function getTimeZoneOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const value = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);

  if (!match) return 0;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);

  return sign * (hours * 60 + minutes);
}

function amsterdamLocalDateToUtc(year: number, month: number, day: number) {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = getTimeZoneOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60_000);
}

function startOfAmsterdamDay(date = new Date()) {
  const { year, month, day } = getAmsterdamParts(date);
  return amsterdamLocalDateToUtc(year, month, day);
}

function startOfAmsterdamMonth(date = new Date()) {
  const { year, month } = getAmsterdamParts(date);
  return amsterdamLocalDateToUtc(year, month, 1);
}

function startOfNextAmsterdamMonth(date = new Date()) {
  const { year, month } = getAmsterdamParts(date);
  return month === 12
    ? amsterdamLocalDateToUtc(year + 1, 1, 1)
    : amsterdamLocalDateToUtc(year, month + 1, 1);
}

function fmtBookingDate(value: Date) {
  return value.toLocaleString("nl-NL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
}

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
        <div
          className={`rounded-lg bg-gradient-to-r ${accent} px-2 py-1 text-base leading-none`}
        >
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
      className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-400/40"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();

  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");

  const now = new Date();

  const startOfToday = startOfAmsterdamDay(now);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const startOfMonth = startOfAmsterdamMonth(now);
  const startOfNextMonth = startOfNextAmsterdamMonth(now);

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
    prisma.partner.count({
      where: { isActive: true },
    }),

    prisma.booking.count({
      where: { status: "CONFIRMED" },
    }),

    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        slot: {
          startTime: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      },
    }),

    prisma.slot.count({
      where: {
        status: "PUBLISHED",
        startTime: {
          gte: now,
        },
      },
    }),

    prisma.booking.aggregate({
      _sum: { depositAmountCents: true },
      where: { status: "CONFIRMED" },
    }),

    prisma.booking.aggregate({
      _sum: { depositAmountCents: true },
      where: {
        status: "CONFIRMED",
        slot: {
          startTime: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
      },
    }),

    prisma.booking.aggregate({
      _sum: { discountAmountCents: true },
      where: { status: "CONFIRMED" },
    }),

    prisma.booking.aggregate({
      _sum: { restAmountCents: true },
      where: { status: "CONFIRMED" },
    }),

    prisma.booking.aggregate({
      _sum: { restAmountCents: true },
      where: {
        status: "CONFIRMED",
        slot: {
          startTime: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
      },
    }),

    prisma.booking.findMany({
      where: { status: "CONFIRMED" },
      select: {
        id: true,
        depositAmountCents: true,
        playersCount: true,
        dogName: true,
        customer: {
          select: {
            name: true,
          },
        },
        partner: {
          select: {
            name: true,
          },
        },
        slot: {
          select: {
            startTime: true,
          },
        },
      },
      orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
  ]);

  const feeTotal = feeTotalAgg._sum.depositAmountCents ?? 0;
  const feeMonth = feeMonthAgg._sum.depositAmountCents ?? 0;
  const discountTotal = discountTotalAgg._sum.discountAmountCents ?? 0;
  const partnerRevenueTotal = partnerRevenueTotalAgg._sum.restAmountCents ?? 0;
  const partnerRevenueMonth = partnerRevenueMonthAgg._sum.restAmountCents ?? 0;

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-stone-700">
              Overzicht van bevestigde boekingen, fee, korting, partners en omzet
              op locatie.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-700">
            ✅ Ingelogd als <b className="font-semibold">{user.email}</b>
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Boekingen" value={bookingsTotalConfirmed} hint={`Vandaag: ${bookingsTodayConfirmed}`} icon="🧾" href="/admin/agenda" />
        <StatCard title="Boekbare slots" value={bookableSlots} hint="Toekomstige gepubliceerde slots" icon="🎯" href="/admin/slots" />
        <StatCard title="Aanbetalingen / fee" value={euro(feeTotal)} hint={`Deze maand: ${euro(feeMonth)}`} icon="💶" href="/admin/revenue" />
        <StatCard title="Gegeven korting" value={euro(discountTotal)} hint="Op bevestigde boekingen" icon="🏷️" href="/admin/revenue" />
        <StatCard title="Partners" value={partnersActive} hint="Actief op het platform" icon="🤝" href="/admin/partners" />
        <StatCard title="Omzet op locatie" value={euro(partnerRevenueTotal)} hint={`Deze maand: ${euro(partnerRevenueMonth)}`} icon="🐾" accent="from-emerald-500/10 to-emerald-600/10" href="/admin/revenue" />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4 md:col-span-2">
          <h2 className="text-sm font-bold tracking-tight">Snelle acties</h2>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link href="/admin/slots" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100">
              📅 Slots
            </Link>
            <Link href="/admin/partners" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100">
              🧭 Partners
            </Link>
            <Link href="/admin/agenda" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100">
              🗓️ Agenda
            </Link>
            <Link href="/admin/revenue" className="rounded-lg border bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100">
              📈 Omzet
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-bold tracking-tight">Recente boekingen</h2>

          <ol className="mt-3 divide-y divide-stone-200">
            {recentBookings.length === 0 ? (
              <p className="text-xs text-stone-600">
                Nog geen bevestigde boekingen.
              </p>
            ) : (
              recentBookings.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-stone-900">
                      👤 {booking.customer?.name ?? "Onbekende klant"}
                    </p>
                    <p className="truncate text-[11px] text-stone-700">
                      🐶 {booking.dogName ?? "—"} <span className="mx-1">•</span>
                      {playersEmoji(booking.playersCount)}
                    </p>
                    <p className="truncate text-[11px] text-stone-500">
                      🏫 {booking.partner?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {booking.slot?.startTime
                        ? fmtBookingDate(booking.slot.startTime)
                        : "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="whitespace-nowrap text-xs font-semibold">
                      {euro(booking.depositAmountCents)}
                    </div>
                    <div className="text-[10px] leading-tight text-stone-500">
                      aanbetaling
                    </div>
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