// PATH: src/app/admin/(protected)/layout.tsx
import { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <AdminLayoutClient email={user?.email ?? "onbekend"}>
      {children}
    </AdminLayoutClient>
  );
}
