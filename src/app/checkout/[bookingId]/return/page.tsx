import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ReturnClient from "./return-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: { bookingId: string } };

export default async function Page({ params }: PageProps) {
  const id = params?.bookingId?.trim();
  if (!id) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!booking) notFound();

  if (booking.status === "CONFIRMED") {
    redirect(`/checkout/${id}/bedankt`);
  }

  return <ReturnClient bookingId={id} />;
}
