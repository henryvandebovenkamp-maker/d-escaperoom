// PATH: src/app/checkout/[bookingId]/return/page.tsx
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ReturnClient from "./return-client";

/* ===================== Helpers ===================== */
async function getParams<T extends Record<string, any>>(p: T | Promise<T>): Promise<T> {
  return (p instanceof Promise ? await p : p) as T;
}

/* ===================== Config ===================== */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ===================== Page ===================== */
type PageProps = {
  params: { bookingId: string } | Promise<{ bookingId: string }>;
};

export default async function Page(props: PageProps) {
  const { bookingId } = await getParams(props.params);
  const id = bookingId?.trim();
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
