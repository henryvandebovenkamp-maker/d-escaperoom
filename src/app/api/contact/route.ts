// PATH: src/app/api/contact/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendTemplateMail } from "@/lib/mail";

// ✅ Garandeer registratie van de contact-templates (ook als register.ts ze nog niet importeert)
import "@/lib/mail/templates/contact";

export const runtime = "nodejs";

const ContactSchema = z.object({
  fullName: z.string().min(2, "Vul je volledige naam in."),
  email: z.string().email("Ongeldig e-mailadres."),
  phone: z.string().optional().nullable(),
  topic: z.string().min(1, "Kies een onderwerp."),
  // ✅ matcht de UI-validatie (≥ 3 tekens)
  message: z.string().min(3, "Bericht is te kort (min. 3 tekens)."),
  callOk: z.boolean(),
});

const CONTACT_TO = process.env.CONTACT_TO || "info@d-escaperoom.com";
const CONTACT_BCC = process.env.CONTACT_BCC;
const DISABLED = process.env.DISABLE_EMAIL === "true";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = ContactSchema.parse(json);

    if (DISABLED) {
      console.log("[/api/contact] DISABLE_EMAIL active. Payload:", data);
      return NextResponse.json({ ok: true, disabled: true });
    }

    // 1) Interne notificatie naar jullie inbox
    await sendTemplateMail(
      "contact-notify",
      {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || undefined,
        topic: data.topic,
        message: data.message,
        callOk: data.callOk,
      },
      {
        to: CONTACT_TO,
        ...(CONTACT_BCC ? { bcc: CONTACT_BCC } : {}),
        replyTo: `${data.fullName} <${data.email}>`,
      }
    );

    // 2) Ontvangstbevestiging naar inzender
    await sendTemplateMail(
      "contact-receipt",
      {
        fullName: data.fullName,
        email: data.email,
        topic: data.topic,
        message: data.message,
      },
      { to: data.email }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const msg = err?.issues?.[0]?.message || err?.message || "Onbekende fout bij verzenden.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "contact" });
}
