"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/auth-context";
import { LogOut, Menu, X } from "lucide-react";

export type PortalNavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type PortalNavSection = {
  title: string;
  items: PortalNavItem[];
};

export type PortalQuickAction = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type RoleShellProps = {
  children: ReactNode;
  themeClassName: string;
  portalLabel: string;
  portalTitle: string;
  portalDescription: string;
  navSections: PortalNavSection[];
  quickActions: PortalQuickAction[];
  minimumRole: "admin" | "operator" | "viewer";
  BrandIcon: React.ComponentType<{ className?: string }>;
};

function flattenNav(sections: PortalNavSection[]) {
  return sections.flatMap((section) => section.items);
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RoleShell({
  children,
  themeClassName,
  portalLabel,
  portalTitle,
  portalDescription,
  navSections,
  quickActions,
  minimumRole,
  BrandIcon,
}: RoleShellProps) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const allItems = flattenNav(navSections);
  const current = allItems.find((item) => isActivePath(pathname, item.href));

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("mobile-menu-open", isMobileMenuOpen);
    return () => {
      document.body.classList.remove("mobile-menu-open");
    };
  }, [isMobileMenuOpen]);

  return (
    <ProtectedRoute minimumRole={minimumRole}>
      <div className={`${themeClassName} relative min-h-screen overflow-hidden`}>
        <div className="pointer-events-none absolute inset-0">
          <div className="admin-background absolute inset-0" />
          <div className="admin-grid absolute inset-0" />
        </div>

        <div className="relative flex min-h-screen">
          <aside className="hidden w-80 shrink-0 flex-col gap-6 border-r border-(--admin-line) bg-[rgba(255,255,255,0.42)] px-6 py-8 backdrop-blur xl:flex">
            <div className="admin-panel p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-(--admin-ink) text-white shadow-[0_12px_24px_rgba(17,20,24,0.25)]">
                  <BrandIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="admin-eyebrow">{portalLabel}</p>
                  <h1 className="admin-title text-2xl">{portalTitle}</h1>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="admin-chip">Role: {role ?? minimumRole}</span>
                <span className="admin-chip">Status: Live</span>
              </div>
              <p className="mt-4 text-xs text-(--admin-muted)">{portalDescription}</p>
            </div>

            <nav className="flex-1 space-y-6">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="admin-eyebrow mb-3 px-2">{section.title}</p>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                            active
                              ? "border-transparent bg-(--admin-ink) text-white shadow-[0_18px_30px_rgba(17,20,24,0.25)]"
                              : "border-(--admin-line) bg-[rgba(255,255,255,0.7)] text-(--admin-ink) hover:-translate-y-0.5 hover:border-(--admin-ink)"
                          }`}
                        >
                          <span
                            className={`grid h-10 w-10 place-items-center rounded-xl text-sm ${
                              active ? "bg-white/10 text-white" : "bg-(--admin-panel) text-(--admin-ink)"
                            }`}
                          >
                            <item.icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className={`text-xs ${active ? "text-white/70" : "text-(--admin-muted)"}`}>
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="admin-panel p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-(--admin-ink) text-white grid place-items-center text-sm font-semibold">
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-(--admin-ink)">{user?.email ?? "user@portal"}</p>
                  <p className="text-xs text-(--admin-muted)">{user?.uid?.slice(0, 12) ?? "offline"}</p>
                </div>
              </div>
              <button
                onClick={() => void logout()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-xs font-semibold text-(--admin-ink) transition hover:border-(--admin-ink) hover:bg-(--admin-panel)"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>

          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity xl:hidden ${
              isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />

          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-80 max-w-[86vw] shrink-0 flex-col gap-6 border-r border-(--admin-line) bg-[rgba(247,251,250,0.98)] px-5 py-6 backdrop-blur xl:hidden transition-transform duration-300 ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="admin-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-(--admin-ink) text-white shadow-[0_12px_24px_rgba(17,20,24,0.25)]">
                    <BrandIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="admin-eyebrow">{portalLabel}</p>
                    <h1 className="admin-title text-xl">{portalTitle}</h1>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-(--admin-line) bg-white text-(--admin-ink)"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="admin-chip">Role: {role ?? minimumRole}</span>
                <span className="admin-chip">Status: Live</span>
              </div>
            </div>

            <nav className="mt-4 flex-1 space-y-5 overflow-y-auto pb-4">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="admin-eyebrow mb-3 px-2">{section.title}</p>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                            active
                              ? "border-transparent bg-(--admin-ink) text-white"
                              : "border-(--admin-line) bg-white text-(--admin-ink)"
                          }`}
                        >
                          <span
                            className={`grid h-10 w-10 place-items-center rounded-xl text-sm ${
                              active ? "bg-white/10 text-white" : "bg-(--admin-panel) text-(--admin-ink)"
                            }`}
                          >
                            <item.icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className={`text-xs ${active ? "text-white/70" : "text-(--admin-muted)"}`}>
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="admin-panel p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold text-(--admin-ink)"
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-(--admin-ink) text-white grid place-items-center text-sm font-semibold">
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-(--admin-ink) truncate">{user?.email ?? "user@portal"}</p>
                  <p className="text-xs text-(--admin-muted)">{user?.uid?.slice(0, 12) ?? "offline"}</p>
                </div>
              </div>
              <button
                onClick={() => void logout()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-xs font-semibold text-(--admin-ink) transition hover:border-(--admin-ink) hover:bg-(--admin-panel)"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-8 lg:px-10">
            <header className="admin-panel flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="admin-eyebrow">{current?.label ?? portalTitle}</p>
                  <h2 className="admin-title text-3xl">{current?.label ?? portalTitle}</h2>
                  <p className="mt-1 text-sm text-(--admin-muted)">
                    {current?.description ?? portalDescription}
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--admin-line) bg-white text-(--admin-ink) xl:hidden"
                  aria-label="Open menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold text-(--admin-ink) transition hover:border-(--admin-ink)"
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </Link>
                ))}
              </div>
            </header>

            <div className="mt-6 flex flex-col gap-5">
              <div className="admin-panel hidden gap-3 overflow-x-auto px-4 py-3 sm:flex xl:hidden">
                {allItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold ${
                        active ? "border-transparent bg-(--admin-ink) text-white" : "border-(--admin-line) bg-white text-(--admin-ink)"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-6">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
