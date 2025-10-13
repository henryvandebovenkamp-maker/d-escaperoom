// PATH: src/lib/mail/templates/_layout.ts
// Eenvoudige, robuuste e-mail layout (600px), met brand-kleuren.
// Inline styles voor brede client-compatibiliteit.
type Brand = "consumer" | "partner";

export function wrapEmail(opts: {
  title: string;
  preheader?: string;
  bodyHTML: string;         // reeds geformatteerde HTML
  cta?: { label: string; url: string } | null;
  brand?: Brand;            // default "consumer"
  footerNote?: string;
}) {
  const brand = opts.brand ?? "consumer";
  const accent = brand === "partner" ? "#0a0a0a" : "#e11d48"; // zwart vs. roze
  const text   = "#0c0c0c";
  const muted  = "#6b7280";
  const bg     = "#fafaf9"; // stone-50
  const border = "#e7e5e4"; // stone-200
  const preheader = (opts.preheader || "").replace(/\s+/g, " ").trim();

  const ctaHTML = opts.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0 0">
         <tr>
           <td>
             <a href="${opts.cta.url}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:${accent};color:#ffffff;text-decoration:none;font-weight:700">
               ${opts.cta.label}
             </a>
           </td>
         </tr>
       </table>`
    : "";

  const footer = opts.footerNote
    ? `<p style="margin:24px 0 0 0;color:${muted};font-size:12px;line-height:1.5">${opts.footerNote}</p>`
    : `<p style="margin:24px 0 0 0;color:${muted};font-size:12px;line-height:1.5">
         Dit is een automatische e-mail van D-EscapeRoom. Antwoord gerust bij vragen.
       </p>`;

  return `
  <!doctype html>
  <html lang="nl">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${escapeHtml(opts.title)}</title>
      <style>
        @media (max-width: 640px) {
          .container { width: 100% !important; border-radius: 0 !important; }
          h1 { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="margin:0;background:${bg};">
      <!-- Preheader (verborgen) -->
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:24px 0">
        <tr>
          <td align="center">
            <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0"
                   style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${border};border-radius:12px;padding:0 24px 24px 24px">
              <tr>
                <td style="padding:20px 0 8px 0;border-bottom:1px solid ${border}">
                  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,'Noto Sans','Liberation Sans';color:${text}">
                    <div style="font-size:14px;color:${muted};letter-spacing:.04em;">D-EscapeRoom</div>
                    <h1 style="margin:6px 0 14px 0;font-size:22px;line-height:1.3;color:${text}">${escapeHtml(opts.title)}</h1>
                </td>
              </tr>

              <tr>
                <td style="padding-top:16px">
                  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,'Noto Sans','Liberation Sans';color:${text};font-size:14px;line-height:1.6">
                    ${opts.bodyHTML}
                    ${ctaHTML}
                    ${footer}
                  </div>
                </td>
              </tr>

            </table>
            <div style="color:${muted};font-size:12px;margin-top:10px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial">© ${new Date().getFullYear()} D-EscapeRoom</div>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]!));
}
