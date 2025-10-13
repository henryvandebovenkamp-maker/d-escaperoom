// Redirect /success -> /bedankt (definitief)
import { redirect } from "next/navigation";

export default function Page({ params }: { params: { bookingId: string } }) {
  redirect(`/checkout/${params.bookingId}/bedankt`);
}
