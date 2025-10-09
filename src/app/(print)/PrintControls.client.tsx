"use client";

import * as React from "react";

export default function PrintControls() {
  return (
    <div className="mt-3 flex gap-2 print:hidden">
      <button
        onClick={() => window.print()}
        className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold shadow-sm hover:bg-stone-50"
      >
        Print / PDF opslaan
      </button>
      <button
        onClick={() => window.close()}
        className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold shadow-sm hover:bg-stone-50"
      >
        Sluiten
      </button>
    </div>
  );
}
