// PATH: src/lib/mail/templates/base.ts

export type TemplateId = "login_code" | "booking_customer" | "booking_partner";

// Variabelen per template
export type TemplateVars = {
  login_code: { code: string; loginUrl: string };

  booking_customer: {
    bookingId: string;
    firstName?: string | null;
    partnerName: string;
    partnerEmail?: string | null;
    slotISO: string;          // bv. 2025-10-11T10:00:00+02:00
    players: number;
    totalCents: number;
    depositCents: number;
    restCents: number;
    address?: string | null;

    // Was verplicht, nu optioneel (knop verdwijnt uit mail)
    manageUrl?: string;

    // ⬇️ NIEUW
    dogName?: string | null;
    googleMapsUrl?: string | null;
  };

  booking_partner: {
    bookingId: string;
    customerName?: string | null;
    customerEmail: string;
    slotISO: string;
    players: number;
    totalCents: number;
    depositCents: number;
    restCents: number;
    partnerDashboardUrl: string;
  };
};

export type TemplateDef<T extends TemplateId> = {
  id: T;
  subject: (v: TemplateVars[T]) => string;  // NL-only
  html: (v: TemplateVars[T]) => string;     // NL-only
  text?: (v: TemplateVars[T]) => string;    // NL-only
};

const registry = new Map<TemplateId, TemplateDef<any>>();

export function register<T extends TemplateId>(def: TemplateDef<T>) {
  registry.set(def.id, def);
}

export function getTemplate<T extends TemplateId>(id: T): TemplateDef<T> {
  const t = registry.get(id);
  if (!t) throw new Error(`Unknown mail template: ${id}`);
  return t as TemplateDef<T>;
}

export function listTemplates(): TemplateId[] {
  return Array.from(registry.keys());
}

/* ---------- Helpers (NL) ---------- */
export function formatEUR(cents: number) {
  return (cents / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
}

// Toon: "zaterdag 11 oktober 2025, 10:00"
export function formatNLDateTime(iso: string) {
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

export function layout(opts: { title: string; preheader?: string; bodyHtml: string }) {
  const { title, preheader = "", bodyHtml } = opts;
  const safePre = preheader.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charSet="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-preheader" content="${safePre}">
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#fafaf9;color:#0c0a09;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;}
    .wrap{max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden}
    .hdr{background:#1c1917;padding:28px}
    .brand{color:#fff;font-weight:800;font-size:20px;letter-spacing:0.5px}
    .content{padding:24px}
    .btn{display:inline-block;padding:12px 16px;border-radius:999px;background:#e11d48;color:#fff;text-decoration:none;font-weight:700}
    .muted{color:#57534e}
    .code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;letter-spacing:4px;background:#f4f4f5;padding:8px 12px;border-radius:10px}
    .hr{height:1px;background:#e7e5e4;margin:20px 0}
    .foot{font-size:12px;color:#78716c;padding:24px;text-align:center}
    table{border-collapse:collapse;width:100%}
    th,td{padding:8px 0;text-align:left;border-bottom:1px solid #f4f4f5}
  </style>
</head>
<body>
  <div style="height:0;opacity:0;overflow:hidden">${safePre}</div>
  <div class="wrap">
    <div class="hdr"><div class="brand">D-EscapeRoom • The Missing Snack</div></div>
    <div class="content">
      ${bodyHtml}
    </div>
  </div>
  <div class="foot">Je ontvangt deze e-mail vanwege een actie op D-EscapeRoom.<br/>© ${new Date().getFullYear()} D-EscapeRoom</div>
</body>
</html>`;
}
