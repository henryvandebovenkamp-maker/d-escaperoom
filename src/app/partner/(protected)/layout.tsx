import { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import PartnerLayoutClient from "./PartnerLayoutClient";

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser(); // bevat email en partnerSlug
  return (
    <PartnerLayoutClient
      email={user?.email ?? "onbekend"}
      partnerSlug={user?.partnerSlug ?? null}
    >
      {children}
    </PartnerLayoutClient>
  );
}
