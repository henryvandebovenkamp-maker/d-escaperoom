"use client";

import * as React from "react";
import { CalendarMonth } from "./calendar/CalendarMonth";
import SeriesForm from "./series/SeriesForm";
import DayLists from "./day/DayLists";
import BulkPublished from "./bulk/BulkPublished";

type Props = {
  initialPartnerSlug: string;
  role: "ADMIN" | "PARTNER";
};

function nowMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function SlotsPageClient({ initialPartnerSlug }: Props) {
  const [partnerSlug, setPartnerSlug] = React.useState(initialPartnerSlug);
  const [monthISO, setMonthISO] = React.useState(nowMonthISO());
  const [selectedDay, setSelectedDay] = React.useState(todayISO());
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    const onPartner = (e: any) => {
      if (e?.detail?.slug) {
        setPartnerSlug(e.detail.slug);
        setSelectedDay(todayISO());
        setRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener("partner:change", onPartner as any);
    return () => window.removeEventListener("partner:change", onPartner as any);
  }, []);

  return (
    <>
      {/* BOVENRIJ: Agenda (links) + Reeks (rechts) — elk 50% */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">📅 Agenda</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const [y, m] = monthISO.split("-").map(Number);
                  const prev = new Date(y, m - 2, 1);
                  setMonthISO(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
                }}
                className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
              >
                Vorige
              </button>
              <button
                onClick={() => {
                  const [y, m] = monthISO.split("-").map(Number);
                  const next = new Date(y, m, 1);
                  setMonthISO(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
                }}
                className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
              >
                Volgende
              </button>
            </div>
          </div>

          <CalendarMonth
            key={partnerSlug + monthISO}
            partnerSlug={partnerSlug}
            monthISO={monthISO}
            selectedDay={selectedDay}
            onSelectDay={(d: React.SetStateAction<string>) => {
              setSelectedDay(d);
              setRefreshKey((k) => k + 1);
            }}
          />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="mb-3 text-xl font-extrabold"> Reeks toevoegen</h2>
          <SeriesForm partnerSlug={partnerSlug} onDone={() => setRefreshKey((k) => k + 1)} />
        </div>
      </div>

      {/* MIDDENRIJ: Links ORANJE, Rechts GROEN/PAARS — elk 50% */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <DayLists
          key={partnerSlug + selectedDay + refreshKey}
          partnerSlug={partnerSlug}
          dayISO={selectedDay}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      {/* ONDER: Bulkbeheer GROEN */}
      <div className="mt-6">
        <BulkPublished
          key={partnerSlug + monthISO + refreshKey}
          partnerSlug={partnerSlug}
          monthISO={monthISO}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </>
  );
}
