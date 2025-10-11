// PATH: src/lib/mail/templates/base.ts

/* ===================== Types ===================== */

export type TemplateId =
  | "login-code"
  | "booking-customer"
  | "booking-partner";

export type TemplateVars = {
  "login-code": {
    code: string;
    loginUrl: string;
  };
  "booking-customer": {
    bookingId: string;
    firstName?: string | null;
    partnerName: string;
    partnerEmail?: string | null;
    slotISO: string;
    players: number;
    totalCents: number;
    depositCents: number;
    restCents: number;
    address?: string | null;
    manageUrl: string;
  };
  "booking-partner": {
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
  subject: (v: TemplateVars[T]) => string;
  html: (v: TemplateVars[T]) => string;
  text?: (v: TemplateVars[T]) => string;
};

/* ===================== Registry (strict) ===================== */

type TMeta = { def: TemplateDef<any>; from: string };
const registry = new Map<TemplateId, TMeta>();

/** Legacy underscore → hyphen aliasing (compat). */
function normalizeId(id: string): TemplateId {
  if (id === "login-code" || id === "booking-customer" || id === "booking-partner") return id;

  // legacy aliases
  if (id === "login_code") {
    // eslint-disable-next-line no-console
    console.warn('[mail] legacy id "login_code" → "login-code"');
    return "login-code";
  }
  if (id === "booking_customer") {
    console.warn('[mail] legacy id "booking_customer" → "booking-customer"');
    return "booking-customer";
  }
  if (id === "booking_partner") {
    console.warn('[mail] legacy id "booking_partner" → "booking-partner"');
    return "booking-partner";
  }
  throw new Error(`[mail] Unknown template id "${id}"`);
}

export function register<T extends TemplateId>(def: TemplateDef<T>): void {
  const id = normalizeId(def.id);
  const from =
    // @ts-ignore Node runtime
    (typeof __filename !== "undefined" && __filename) ||
    // @ts-ignore Edge/browser
    ((typeof importMeta !== "undefined" && (importMeta as any)?.url) || "unknown");

  if (registry.has(id)) {
    const prev = registry.get(id)!;
    throw new Error(
      `[mail] Duplicate template id "${id}"\n` +
      ` - first:  ${prev.from}\n` +
      ` - second: ${from}`
    );
  }
  registry.set(id, { def: { ...def, id } as TemplateDef<T>, from });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug(`[mail] registered: ${id} ← ${from}`);
  }
}

export function getTemplate<T extends TemplateId>(id: T): TemplateDef<T> {
  const norm = normalizeId(id);
  const meta = registry.get(norm);
  if (!meta) {
    const known = listTemplates().map(t => `${t.id} ← ${t.from}`).join("\n  ");
    throw new Error(`[mail] Unknown mail template: ${norm}\nKnown:\n  ${known}`);
  }
  return meta.def as TemplateDef<T>;
}

export function listTemplates(): Array<{ id: TemplateId; from: string }> {
  return Array.from(registry.entries()).map(([id, meta]) => ({ id, from: meta.from }));
}

/* ===================== Helpers (NL) ===================== */

export function formatEUR(cents: number): string {
  const n = (cents ?? 0) / 100;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatNLDateTime(iso: string): string {
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

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] || c;
  });
}

/* ===================== Layout (zonder hardcoded header) ===================== */

export function layout(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  closingHtml?: string | null;
  brandHeader?: string | null;   // bv. "D-EscapeRoom • The Missing Snack"
  brandTagline?: string | null;  // footer tekst
  logoUrl?: string | null;       // optioneel logo
}): string {
  const title = escapeHtml(opts.title);
  const preheader = escapeHtml(opts.preheader ?? "");
  const bodyHtml = opts.bodyHtml ?? "";
  const closingHtml = opts.closingHtml ?? null;
  const brandHeader = opts.brandHeader ?? null;
  const brandTagline = opts.brandTagline ?? "Je ontvangt deze e-mail vanwege een actie op D-EscapeRoom.";
  const logoUrl = opts.logoUrl ?? null;

  const headerHtml =
    brandHeader || logoUrl
      ? [
          '<div class="hdr">',
          logoUrl
            ? `<img class="logo" src="${logoUrl}" alt="${escapeHtml(brandHeader ?? "D-EscapeRoom")}">`
            : `<div class="brand">${escapeHtml(brandHeader!)}</div>`,
          "</div>",
        ].join("")
      : "";

  const closingBlock = closingHtml
    ? `<div class="hr"></div><div>${closingHtml}</div>`
    : "";

  const footText = brandTagline
    ? `${escapeHtml(brandTagline)}<br/>© ${new Date().getFullYear()} D-EscapeRoom`
    : `© ${new Date().getFullYear()} D-EscapeRoom`;

  return [
    "<!doctype html>",
    '<html lang="nl">',
    "<head>",
    '  <meta charSet="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <meta name="x-preheader" content="${preheader}">`,
    `  <title>${title}</title>`,
    "  <style>",
    "    body{margin:0;padding:0;background:#fafaf9;color:#0c0a09;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;}",
    "    .wrap{max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden}",
    "    .hdr{padding:20px 24px;border-bottom:1px solid #eee;background:#fff}",
    "    .brand{color:#0c0a09;font-weight:800;font-size:14px;letter-spacing:0.2px}",
    "    .content{padding:24px}",
    "    .btn{display:inline-block;padding:12px 16px;border-radius:999px;background:#e11d48;color:#fff;text-decoration:none;font-weight:700}",
    "    .muted{color:#57534e}",
    "    .code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;letter-spacing:4px;background:#f4f4f5;padding:8px 12px;border-radius:10px}",
    "    .hr{height:1px;background:#e7e5e4;margin:20px 0}",
    "    .foot{font-size:12px;color:#78716c;padding:16px 0 24px 0;text-align:center}",
    "    table{border-collapse:collapse;width:100%}",
    "    th,td{padding:8px 0;text-align:left;border-bottom:1px solid #f4f4f5}",
    "    img.logo{max-height:28px;display:block}",
    "  </style>",
    "</head>",
    "<body>",
    `  <div style="height:0;opacity:0;overflow:hidden">${preheader}</div>`,
    `  ${headerHtml}`,
    '  <div class="wrap">',
    '    <div class="content">',
    `      ${bodyHtml}`,
    `      ${closingBlock}`,
    "    </div>",
    "  </div>",
    `  <div class="foot">${footText}</div>`,
    "</body>",
    "</html>",
  ].join("\n");
}

/* Forceer module-context (fix voor TS2306 in strikte settings) */
export {};
