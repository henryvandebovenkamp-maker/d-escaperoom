// PATH: src/lib/mail/templates/review-request.ts
import {
  registerTemplate,
  type TemplateVars,
} from "@/lib/mail/templates/base";

type Vars = TemplateVars["review-request"];

registerTemplate("review-request", {
  subject: ({ partnerName }: Vars) =>
    `Hoe was jullie avontuur bij ${partnerName}? 🤠`,

  html: ({
    customerName,
    partnerName,
    dogName,
    reviewUrl,
  }: Vars) => {
    return `
      <div style="background:#0c0a09;padding:40px 20px;font-family:Arial,sans-serif;color:#ffffff;">
        <div style="max-width:600px;margin:0 auto;background:#1c1917;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;">

          <div style="padding:40px 32px;">
            <div style="
              display:inline-block;
              padding:8px 14px;
              border-radius:999px;
              background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.12);
              font-size:11px;
              letter-spacing:0.22em;
              font-weight:700;
              color:#fde68a;
              text-transform:uppercase;
            ">
              D-EscapeRoom
            </div>

            <h1 style="
              margin:24px 0 0;
              font-size:38px;
              line-height:1.05;
              color:#fda4af;
              font-weight:900;
            ">
              Hoe was jullie avontuur?
            </h1>

            <p style="
              margin:24px 0 0;
              font-size:16px;
              line-height:1.8;
              color:#e7e5e4;
            ">
              Hoi ${customerName},
            </p>

            <p style="
              margin:18px 0 0;
              font-size:16px;
              line-height:1.8;
              color:#d6d3d1;
            ">
              Bedankt voor jullie bezoek aan <strong>${partnerName}</strong>.
              We hopen dat jullie samen een geweldige tijd hebben gehad tijdens
              <strong>The Stolen Snack</strong>.
            </p>

            ${
              dogName
                ? `
              <p style="
                margin:18px 0 0;
                font-size:16px;
                line-height:1.8;
                color:#d6d3d1;
              ">
                Geef ${dogName} ook nog maar een extra snack van ons 🤠🐾
              </p>
            `
                : ""
            }

            <div style="
              margin-top:32px;
              padding:20px;
              border-radius:22px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.08);
            ">
              <p style="
                margin:0;
                font-size:15px;
                line-height:1.7;
                color:#f5f5f4;
              ">
                Reviews helpen andere hondenbaasjes enorm om te ontdekken hoe leuk
                deze ervaring samen met hun hond kan zijn.
              </p>
            </div>

            <div style="margin-top:34px;">
              <a
                href="${reviewUrl}"
                style="
                  display:inline-block;
                  background:#e11d48;
                  color:#ffffff;
                  text-decoration:none;
                  padding:16px 28px;
                  border-radius:18px;
                  font-size:16px;
                  font-weight:700;
                "
              >
                Schrijf een review
              </a>
            </div>

            <p style="
              margin:30px 0 0;
              font-size:13px;
              line-height:1.7;
              color:#a8a29e;
            ">
              Duurt minder dan 1 minuut ✨
            </p>
          </div>
        </div>
      </div>
    `;
  },

  text: ({
    customerName,
    partnerName,
    reviewUrl,
  }: Vars) => `
Hoi ${customerName},

Bedankt voor jullie bezoek aan ${partnerName} en het spelen van The Stolen Snack.

We horen graag hoe jullie het avontuur hebben ervaren.

Schrijf hier jullie review:
${reviewUrl}

Groet,
D-EscapeRoom
`,
});