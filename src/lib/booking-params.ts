// PATH: src/lib/…/get-booking-id.ts (waar jouw functie staat)
import { redirect } from "next/navigation";

export function getBookingId(req: Request, params?: { bookingId?: string | null }) {
  const fromParams = params?.bookingId?.trim();
  if (fromParams) return fromParams;

  const url = new URL(req.url);
  const fromQuery =
    url.searchParams.get("bookingId") ||
    url.searchParams.get("id") ||
    url.searchParams.get("bookingID");
  if (fromQuery) return fromQuery.trim();

  // Fallback: /checkout/:id/(return|success|bedankt)
  const parts = url.pathname.split("/").filter(Boolean); // ["checkout", ":id", "return"]

  if (parts[0] === "checkout" && parts[1]) {
    // 🔒 Canonicaliseer: /success mag niet → stuur ALTÍJD naar /bedankt
    const step = (parts[2] ?? "").toLowerCase();
    if (step === "success") {
      redirect(`/checkout/${parts[1]}/bedankt`); // throws; stopt verdere verwerking
    }
    return parts[1];
  }

  return null;
}
