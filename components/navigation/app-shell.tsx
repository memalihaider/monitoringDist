"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  LayoutDashboard,
  Server,
  Activity,
  FileText,
  BookOpen,
  Settings,
  ShieldCheck,
  LogOut,
  MonitorCheck
} from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Services", icon: Server },
  { href: "/alerts", label: "Alerts", icon: Activity },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/docs", label: "Documentation", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin/dashboard", label: "Admin", icon: ShieldCheck },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  const isAdminRoute = pathname.startsWith("/admin");
  const isRolePortalRoute = pathname.startsWith("/operator") || pathname.startsWith("/viewer");
  const isPublicRoute = pathname === "/" || pathname.startsWith("/login");
  const isLegacyPortalRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/settings");

  if (!user || isAdminRoute || isRolePortalRoute || isPublicRoute || isLegacyPortalRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden text-black">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r-2 border-black flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b-2 border-black shrink-0">
          <div className="flex items-center gap-2 text-black mb-2">
            <MonitorCheck className="w-6 h-6" />
            <span className="font-black text-xl tracking-tighter uppercase italic">MonitorDist</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-white rounded-full text-[10px] font-black uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000]">
            <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></div>
            {role}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navLinks.map((item) => {
            if (item.href.startsWith("/admin") && role !== "admin") return null;

            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? "bg-black text-white border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]"
                    : "border-transparent text-black/60 hover:border-black hover:text-black hover:bg-neutral-50"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-black/40"}`} />
                <span className="font-black text-sm uppercase tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t-2 border-black shrink-0">
          <button
            onClick={() => void logout()}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-black border-2 border-black hover:bg-black hover:text-white transition-colors cursor-pointer rounded-xl active:translate-y-px"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="bg-white border-b-2 border-black px-8 py-5 items-center justify-between sticky top-0 z-10 hidden md:flex shrink-0">
          <div>
            <h1 className="text-2xl font-black text-black uppercase tracking-tighter">
              {navLinks.find((l) => pathname.startsWith(l.href))?.label || "Platform"}
            </h1>
            <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Distributed Observability</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-black text-black leading-none">{user.email}</p>
              <p className="text-[10px] font-bold text-black/40 mt-1 uppercase tracking-tighter">ID: {user.uid.slice(0, 8)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl border-2 border-black bg-white flex items-center justify-center text-black font-black text-xl shadow-[3px_3px_0_0_#000]">
              {user.email?.[0].toUpperCase() || "U"}
            </div>
          </div>
        </header>
        
        {/* Mobile Header */}
        <header className="bg-white border-b-2 border-black px-4 py-3 flex items-center justify-between md:hidden shrink-0">
          <div className="flex items-center gap-2">
             <MonitorCheck className="w-6 h-6 text-black" />
             <span className="font-black text-lg uppercase">MonitorDist</span>
          </div>
          <button onClick={() => void logout()} className="p-2 border-2 border-black rounded-lg cursor-pointer">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-10 bg-white">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}