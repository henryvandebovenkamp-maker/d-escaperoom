// PATH: src/lib/partner.ts
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

/**
 * Resolve de juiste partner bij een request.
 * - PARTNER users: altijd hun eigen partnerId/slug
 * - ADMIN users: partnerSlug moet meegegeven worden
 */
export async function resolvePartnerForRequest(
  user: SessionUser | null,
  slugFromClient?: string | null
): Promise<{ id: string; slug: string }> {
  if (user?.role === "PARTNER") {
    if (!user.partnerId || !user.partnerSlug) {
      throw new Error("Partner-account heeft geen partner gekoppeld.");
    }
    return { id: user.partnerId, slug: user.partnerSlug };
  }

  // ADMIN: slug is verplicht
  const slug = slugFromClient?.trim();
  if (!slug) throw new Error("partnerSlug is verplicht voor admins.");

  const partner = await prisma.partner.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!partner) throw new Error("Partner niet gevonden");

  return partner;
}
