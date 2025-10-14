// PATH: src/app/booking/[bookingId]/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---- helpers ---- */
function eur(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
}
function nlDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function StatusBadge({ status }: { status: "PENDING" | "CONFIRMED" | "CANCELLED" }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: "border-amber-300 bg-amber-100 text-amber-800", label: "In afwachting" },
    CONFIRMED: { cls: "border-emerald-300 bg-emerald-100 text-emerald-800", label: "Bevestigd" },
    CANCELLED: { cls: "border-rose-300 bg-rose-100 text-rose-800", label: "Geannuleerd" },
  };
  const s = map[status] || map.PENDING;
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${s.cls}`}>{s.label}</span>;
}

/* ---- page ---- */
export default async function BookingDetailPage({ params }: { params: { bookingId: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { partner: true, slot: true, customer: true, discountCode: true },
  });

  if (!booking || !booking.slot || !booking.partner) return notFound();

  // ⚠️ Deze pagina triggert geen e-mails. Alle e-mails lopen via de return-flow.

  const partner = booking.partner as any;
  const slotISO = (booking.slot as any).startTime?.toISOString?.() ?? String((booking.slot as any).startTime);
  const addressParts = [partner?.addressLine1, partner?.postalCode, partner?.city].filter(Boolean);
  const address = addressParts.join(", ");
  const mapsUrl = (partner?.googleMapsUrl as string | undefined) || "";

  const total = Number((booking as any).totalAmountCents ?? 0);
  const deposit = Number((booking as any).depositAmountCents ?? 0);
  const rest = Number((booking as any).restAmountCents ?? Math.max(total - deposit, 0));
  const players = Number((booking as any).playersCount ?? (booking as any).players ?? 1);
  const dogName = (booking as any).dogName as string | null;
  const dogAllergies = (booking as any).dogAllergies as string | null;
  const dogFears = (booking as any).dogFears as string | null;
  const dogTrackingLevel = (booking as any).dogTrackingLevel as string | null;

  const confirmed = Boolean(booking.confirmedAt);

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="pointer-events-none sticky top-0 z-0 h-2 w-full bg-gradient-to-r from-rose-200 via-pink-300 to-rose-200" />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Boekingsdetails</h1>
            <p className="mt-1 text-stone-700">
              Boekingsnummer: <span className="font-mono">{booking.id}</span>
            </p>
          </div>
          <StatusBadge status={booking.status as any} />
        </header>

        <section className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="px-5 py-4 bg-stone-50 border-b border-stone-200">
            <h2 className="text-lg font-semibold">Overzicht</h2>
          </div>
          <div className="px-5 py-4">
            <dl className="grid grid-cols-1 gap-y-3">
              <Row label="Hondenschool" value={partner?.name || "—"} />
              <Row label="Datum & tijd" value={nlDateTime(slotISO)} />
              <Row label="Deelnemers" value={`${players} ${players === 1 ? "speler" : "spelers"}`} />
              {address && (
                <div className="rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2">
                  <div className="text-sm font-semibold text-stone-700">Adres</div>
                  <div className="text-sm">{address}</div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-pink-700 underline"
                    >
                      Route in Google Maps openen
                    </a>
                  )}
                </div>
              )}
            </dl>

            <div className="h-px bg-stone-200 my-4" />

            <dl className="grid grid-cols-1 gap-y-2">
              <Row label="Totaal" value={eur(total)} emphasize />
              <Row label={`Aanbetaling${confirmed ? " (betaald)" : ""}`} value={eur(deposit)} />
              <Row label="Rest op locatie" value={eur(rest)} />
              {booking.discountCode && (booking as any).discountAmountCents > 0 && (
                <Row
                  label={`Korting (${booking.discountCode.code})`}
                  value={`- ${eur((booking as any).discountAmountCents)}`}
                />
              )}
            </dl>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="px-5 py-4 bg-stone-50 border-b border-stone-200">
            <h2 className="text-lg font-semibold">Gegevens van je hond</h2>
          </div>
          <div className="px-5 py-4 grid gap-2">
            <Row label="Naam" value={dogName || "—"} />
            <Row label="Ervaring speuren" value={mapTracking(dogTrackingLevel)} />
            <Row label="Allergieën" value={dogAllergies || "—"} />
            <Row label="Bang voor" value={dogFears || "—"} />
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {booking.status !== "CANCELLED" && !confirmed && (
            <a
              href={`/checkout/${booking.id}`}
              className="inline-flex items-center justify-center rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
            >
              Betaal aanbetaling
            </a>
          )}
          <a href="/" className="text-sm text-stone-700 underline">
            Terug naar home
          </a>
        </div>
      </div>
    </main>
  );
}

/* ---- small UI atoms ---- */
function Row({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 ${
        emphasize ? "bg-stone-50" : "bg-stone-50/60"
      }`}
    >
      <span className="text-sm text-stone-700">{label}</span>
      <strong className={`text-sm ${emphasize ? "text-stone-900" : "text-stone-800"}`}>{value}</strong>
    </div>
  );
}

function mapTracking(level?: string | null) {
  switch ((level || "NONE").toUpperCase()) {
    case "BEGINNER":
      return "Beginner";
    case "AMATEUR":
      return "Amateur";
    case "PRO":
      return "Pro";
    default:
      return "Nee / Onbekend";
  }
}
