// PATH: src/app/partner/(protected)/PartnerLayoutClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
  email: string;
  partnerSlug: string | null;
};

/* ============ Utils ============ */
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function normalize(p?: string | null) {
  if (!p) return "/";
  return p.endsWith("/") && p !== "/" ? p.slice(0, -1) : p;
}

/* ============ NavLink ============ */
function NavLink({
  href,
  children,
  onClick,
  size = "md",
}: React.PropsWithChildren<{
  href: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}>) {
  const pathnameRaw = usePathname();
  const pathname = normalize(pathnameRaw);
  const target = normalize(href);
  const active = pathname === target || pathname.startsWith(target + "/");

  const base =
    size === "lg"
      ? "px-4 py-3 text-base"
      : size === "sm"
      ? "px-2 py-1.5 text-sm"
      : "px-3 py-2 text-sm";

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative rounded-xl font-medium transition hover:underline underline-offset-4",
        base,
        active ? "text-stone-900" : "text-stone-700"
      )}
    >
      {children}
      {size !== "lg" && (
        <span
          className={cx(
            "pointer-events-none absolute left-2 right-2 -bottom-[2px] h-[3px] rounded-full",
            "bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500",
            active ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </Link>
  );
}

/* ============ Layout ============ */
export default function PartnerLayoutClient({ children, email, partnerSlug }: Props) {
  const router = useRouter();
  const pathnameRaw = usePathname();
  const pathname = normalize(pathnameRaw);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Redirect legacy paden → /partner/discounts
  React.useEffect(() => {
    if (!pathname) return;
    const legacyRedirects: Record<string, string> = {
      "/partner/acties": "/partner/discounts",
      "/partner/actions": "/partner/discounts",
      "/partner/coupons": "/partner/discounts",
    };
    const dest = legacyRedirects[pathname];
    if (dest) router.replace(dest);
  }, [pathname, router]);

  // Sluit drawer bij routewijziging
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      {/* dunne gradient strip */}
      <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />

      {/* ======= MOBILE HEADER (<= md) ======= */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:hidden">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="text-xl font-extrabold tracking-tight">D-EscapeRoom</div>

            <button
              type="button"
              aria-label={mobileOpen ? "Menu sluiten" : "Menu openen"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={cx(
                "rounded-2xl border border-stone-300 px-3 py-2 shadow-sm",
                "hover:bg-stone-50 active:scale-[0.98] transition"
              )}
            >
              <span className="block h-4 w-6">
                <span className="block h-[2px] w-full bg-stone-900"></span>
                <span className="mt-1 block h-[2px] w-full bg-stone-900"></span>
                <span className="mt-1 block h-[2px] w-full bg-stone-900"></span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-[90%] rounded-l-2xl bg-white shadow-xl ring-1 ring-stone-200">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="text-lg font-semibold">Partnermenu</div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
                aria-label="Sluiten"
              >
                Sluiten
              </button>
            </div>

            <div className="px-2 pb-4">
              <nav className="flex flex-col">
                <NavLink href="/partner/dashboard" size="lg">📊 Dashboard</NavLink>
                <NavLink href="/partner/slots" size="lg">🗓️ Tijdsloten</NavLink>
                <NavLink href="/partner/agenda" size="lg">📅 Agenda</NavLink>
                <NavLink href="/partner/profile" size="lg">🏷️ Profiel</NavLink>
                <NavLink href="/partner/revenue" size="lg">💶 Omzet</NavLink>
                <NavLink href="/partner/discounts" size="lg">％ Kortingen/Acties</NavLink>
              </nav>

              <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
                Ingelogd als{" "}
                <span className="font-medium text-stone-900">{email}</span>
                {partnerSlug ? (
                  <>
                    {" "}· partner:{" "}
                    <span className="font-medium text-stone-900">{partnerSlug}</span>
                  </>
                ) : null}
              </div>

              <form action="/api/auth/logout" method="post" className="mt-4 px-2">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
                >
                  Uitloggen
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======= DESKTOP/TABLET HEADER (>= md) ======= */}
      <header className="sticky top-0 z-30 hidden border-b border-stone-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:block">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-4">
            {/* Links: titel + sub */}
            <div className="flex-1 min-w-[320px]">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold tracking-tight">Partner</span>
                <span role="img" aria-label="paw" className="text-2xl">🐾</span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                Welkom in het Partnerportaal, je bent ingelogd als{" "}
                <span className="font-medium text-stone-900">{email}</span>
                {partnerSlug ? (
                  <>
                    {" "}· partner:{" "}
                    <span className="font-medium text-stone-900">{partnerSlug}</span>
                  </>
                ) : null}
              </p>
            </div>

            {/* Rechts: nav + uitlog */}
            <div className="shrink-0">
              <div className="flex items-center gap-3">
                <nav className="flex flex-wrap items-center gap-2">
                  <NavLink href="/partner/dashboard">📊 Dashboard</NavLink>
                  <NavLink href="/partner/slots">🗓️ Tijdsloten</NavLink>
                  <NavLink href="/partner/agenda">📅 Agenda</NavLink>
                  <NavLink href="/partner/profile">🏷️ Profiel</NavLink>
                  <NavLink href="/partner/revenue">💶 Omzet</NavLink>
                  <NavLink href="/partner/discounts">％ Kortingen/Acties</NavLink>
                </nav>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
                  >
                    Uitloggen
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ======= CONTENT ======= */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          <div className="pointer-events-none absolute inset-x-0 -top-[1px] h-[3px] rounded-t-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </section>
      </main>
    </div>
  );
}
