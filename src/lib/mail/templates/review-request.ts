// PATH: src/lib/mail/templates/review-request.ts
import {
  registerTemplate,
  type TemplateVars,
} from "@/lib/mail/templates/base";

type Vars = TemplateVars["review-request"];

registerTemplate("review-request", {
  subject: () => "Jullie speurtocht zit erop… mogen we iets vragen? 🐾",

  html: ({ customerName, partnerName, dogName, reviewUrl }: Vars) => `
    <div style="margin:0;padding:0;background:#0c0a09;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c0a09;padding:26px 12px;font-family:Arial,sans-serif;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#1c1917;border-radius:26px;border:1px solid #3a2d2a;overflow:hidden;">
              <tr>
                <td style="padding:0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#3b1826;">
                    <tr>
                      <td style="padding:26px 24px;">
                        <p style="margin:0;color:#fde68a;font-size:11px;letter-spacing:0.24em;font-weight:bold;text-transform:uppercase;">
                          D-EscapeRoom
                        </p>

                        <h1 style="margin:14px 0 0;color:#fda4af;font-size:34px;line-height:1.08;font-weight:900;">
                          Bedankt voor jullie speurwerk 🤠
                        </h1>

                        <p style="margin:14px 0 0;color:#f5f5f4;font-size:15px;line-height:1.7;">
                          The Stolen Snack is natuurlijk pas écht compleet met de verhalen van baasjes en honden die hem gespeeld hebben.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding:24px;">
                        <p style="margin:0;color:#f5f5f4;font-size:16px;line-height:1.7;">
                          Hoi ${customerName},
                        </p>

                        <p style="margin:14px 0 0;color:#d6d3d1;font-size:15px;line-height:1.8;">
                          Wat leuk dat jullie bij <strong>${partnerName}</strong> zijn geweest.
                          We zijn heel benieuwd hoe jullie het speuren, samenwerken en puzzelen hebben ervaren.
                        </p>

                        ${
                          dogName
                            ? `<p style="margin:14px 0 0;color:#d6d3d1;font-size:15px;line-height:1.8;">
                                En natuurlijk: geef <strong>${dogName}</strong> nog maar een extra snack van ons 🐾
                              </p>`
                            : ""
                        }

                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;background:#292524;border-radius:18px;border:1px solid #44403c;">
                          <tr>
                            <td style="padding:18px;">
                              <p style="margin:0;color:#ffffff;font-size:16px;line-height:1.65;font-weight:bold;">
                                Wil je jouw ervaring kort delen?
                              </p>
                              <p style="margin:8px 0 0;color:#d6d3d1;font-size:14px;line-height:1.7;">
                                Daarmee help je andere hondenbaasjes om te ontdekken of D-EscapeRoom ook iets voor hen is.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                          <tr>
                            <td align="center" bgcolor="#db2777" style="border-radius:16px;">
                              <a href="${reviewUrl}" style="display:inline-block;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">
                                Mijn ervaring delen
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:18px 0 0;color:#a8a29e;font-size:13px;line-height:1.6;">
                          Het hoeft niet lang te zijn — één of twee zinnen is al super waardevol.
                        </p>

                        <p style="margin:22px 0 0;color:#f5f5f4;font-size:14px;line-height:1.7;">
                          Dankjewel,<br />
                          <strong>D-EscapeRoom</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:14px 0 0;color:#78716c;font-size:12px;">
              © D-EscapeRoom
            </p>
          </td>
        </tr>
      </table>
    </div>
  `,

  text: ({ customerName, partnerName, reviewUrl }: Vars) => `
Hoi ${customerName},

Bedankt voor jullie bezoek aan ${partnerName}.

We zijn heel benieuwd hoe jullie het speuren, samenwerken en puzzelen hebben ervaren.

Wil je jouw ervaring kort delen?
${reviewUrl}

Eén of twee zinnen is al super waardevol.

Dankjewel,
D-EscapeRoom
`,
});