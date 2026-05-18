// PATH: src/app/api/test/review-mail/route.ts
import { NextResponse } from "next/server";
import { sendTemplateMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sendTemplateMail({
      template: "review-request",
      to: "henry@dog-connect.nl",
      vars: {
        customerName: "Henry",
        partnerName: "WoofExperience",
        dogName: "Sam",
        reviewUrl:
          "https://www.d-escaperoom.com/review?email=henry%40dog-connect.nl",
        locale: "nl",
      },
    });

    return NextResponse.json({
      ok: true,
      result,
      message: "Testmail verzonden naar henry@dog-connect.nl",
    });
  } catch (error) {
    console.error("[test_review_mail_error]", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}