// PATH: src/lib/mail/templates/base.ts
import { z } from "zod";

export type Locale = "nl" | "en" | "de" | "es";
export type TemplateId = "login_code" | "booking_customer" | "booking_partner";

export type RenderHelpers = {
  appOrigin: string;
  euro: (cents: number) => string;
  renderBase: (opts: { title: string; lead?: string; body: string; locale: Locale }) => string;
};

export type TemplateDef<V extends z.ZodTypeAny> = {
  id: TemplateId;
  varsSchema: V;
  subject(locale: Locale, v: z.infer<V>): string;
  renderHtml(locale: Locale, v: z.infer<V>, h: RenderHelpers): string;
  renderText?(locale: Locale, v: z.infer<V>): string;
};

// ✅ value export → maakt dit gegarandeerd een module
export const registry = new Map<TemplateId, TemplateDef<any>>();

export function registerTemplate<T extends z.ZodTypeAny>(def: TemplateDef<T>) {
  registry.set(def.id, def);
}

export function getTemplate(id: TemplateId) {
  const t = registry.get(id);
  if (!t) throw new Error(`Unknown mail template: ${id}`);
  return t;
}

export function renderBaseFactory(appOrigin: string) {
  return ({ title, lead, body }: { title: string; lead?: string; body: string; locale: Locale }) => `<!doctype html>
<html lang="nl">
<head>
  <meta charSet="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(title)}</title>
  <style>
    body{margin:0;padding:0;background:#fafaf9;color:#0c0a09;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial}
    .container{max-width:640px;margin:0 auto;padding:24px}
    .card{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:24px}
    .btn{display:inline-block;padding:12px 16px;border-radius:10px;text-decoration:none;border:1px solid #0a0a0a}
    .muted{color:#57534e;font-size:12px}
    h1{font-size:20px;margin:0 0 6px 0}
    h2{font-size:16px;margin:18px 0 6px 0}
    p{margin:10px 0}
    hr{border:none;border-top:1px solid #e7e5e4;margin:18px 0}
    table{width:100%;border-collapse:collapse}
    td{padding:6px 0;vertical-align:top}
    .right{text-align:right}
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>${escapeHtml(title)}</h1>
      ${lead ? `<p class="muted">${escapeHtml(lead)}</p>` : ""}
      ${body}
      <hr />
      <p class="muted">D-EscapeRoom • <a href="${appOrigin}" target="_blank" rel="noopener">Website</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m] as string));
}
