import { getSessionUser } from "@/lib/auth";

/** Haal user op of returnt null */
export async function currentUser() {
  try {
    return await getSessionUser();
  } catch {
    return null;
  }
}

export function isAdmin(u: { role: "ADMIN" | "PARTNER" } | null) {
  return u?.role === "ADMIN";
}

/** PARTNER mag alléén z'n eigen slug bevragen; ADMIN mag alles */
export function assertPartnerAccessOrThrow(user: any, reqSlug: string) {
  if (!user) return; // laat anoniem door als je dat wilt; zet hier anders throw
  if (isAdmin(user)) return;
  if (user.partnerSlug && user.partnerSlug === reqSlug) return;
  throw new Response("Forbidden", { status: 403 });
}
