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
  if (parts[0] === "checkout" && parts[1]) return parts[1];

  return null;
}
