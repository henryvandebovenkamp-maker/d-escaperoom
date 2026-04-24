"use client";

export default function PrintControls() {
  return (
    <div className="no-print fixed right-4 top-4 z-50 flex gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
      >
        Printen
      </button>

      <button
        type="button"
        onClick={() => window.history.back()}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm hover:bg-stone-50"
      >
        Terug
      </button>
    </div>
  );
}