// PATH: src/lib/mail/templates/base.ts
type BaseHtmlOpts = {
  title: string;
  preheader?: string;
  body: string;
  logoUrl?: string;
};

export function renderBaseHtml({ title, preheader, body, logoUrl }: BaseHtmlOpts) {
  const bg = "#fafaf9";      // stone-50
  const text = "#0c0a09";    // stone-950
  const muted = "#57534e";   // stone-600
  const card = "#ffffff";
  const border = "#e7e5e4";  // stone-200

  const pre = (preheader ?? "").replace(/\s+/g, " ").trim();

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(title)}</title>
  <style>
    body,table,td,a{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'Noto Sans',sans-serif;
    }
    img{border:0;outline:none;text-decoration:none;display:block;max-width:100%;height:auto}
    table{border-collapse:collapse!important}
    a{text-decoration:none;color:inherit}

    .wrap{padding:36px 0}
    .container{width:640px;max-width:100%}
    .px{padding-left:20px;padding-right:20px}
    .shadow{box-shadow:0 8px 24px rgba(0,0,0,.06)}
    .card{border:1px solid ${border};border-radius:20px;background:${card}}
    .cardpad{padding:36px}
    .lh{line-height:1.7}
    .chip{
      display:inline-block;background:#f3f4f6;color:#111827;border-radius:16px;
      padding:16px 18px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,Monaco,'Courier New',monospace;
      font-size:30px;letter-spacing:8px
    }
    .muted{color:${muted}}

    @media only screen and (max-width:480px){
      .wrap{padding:28px 0!important}
      .px{padding-left:22px!important;padding-right:22px!important}
      .card{border-radius:22px!important}
      .cardpad{padding:28px!important}
      .chip{font-size:32px!important;letter-spacing:10px!important;padding:18px 20px!important;margin:10px 0 16px!important}
      .lh{line-height:1.75!important}
      .muted{font-size:13px!important}
      h1{font-size:22px!important;margin-bottom:12px!important}
      p{font-size:16px!important}
    }

    @media (prefers-color-scheme: dark){
      body{background:#0b0b0b!important}
      .card{background:#111827!important;border-color:#1f2937!important}
      .muted{color:#9ca3af!important}
      .chip{background:#0b1220;color:#f9fafb}
    }
  </style>
</head>
<body style="margin:0;background:${bg}">
  <span style="display:none;visibility:hidden;opacity:0;max-height:0;max-width:0;overflow:hidden;">
    ${escapeHtml(pre)}
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrap">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" class="container px">
        <!-- Content card -->
        <tr>
          <td>
            <table role="presentation" width="100%" class="card shadow">
              <tr>
                <td class="cardpad">
                  <div class="lh" style="color:${text};font-size:16px">
                    ${body}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 8px 0;text-align:center;font-size:12px" class="muted lh">
            Je ontving deze e-mail omdat er een login werd aangevraagd.<br/>
            D-EscapeRoom · Lakerveld / Lexmond · Nederland<br/>
            Vragen? Bel 06-83853373 of reageer op deze mail.
          </td>
        </tr>
        <tr><td style="height:14px"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] as string));
}
