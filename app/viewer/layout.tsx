"use client";

import type { ReactNode } from "react";
import { Outfit, Syne } from "next/font/google";
import {
  BellRing,
  BookOpen,
  FileText,
  LayoutDashboard,
  MonitorCheck,
  Server,
  Settings,
} from "lucide-react";
import RoleShell, { type PortalNavSection, type PortalQuickAction } from "@/components/portal/role-shell";

const portalHead = Syne({
  subsets: ["latin"],
  variable: "--font-admin-head",
});

const portalBody = Outfit({
  subsets: ["latin"],
  variable: "--font-admin-body",
});

const navSections: PortalNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/viewer/dashboard",
        label: "Dashboard",
        description: "Live service pulse and status checks.",
        icon: LayoutDashboard,
      },
      {
        href: "/viewer/alerts",
        label: "Alerts",
        description: "Read-only incident visibility.",
        icon: BellRing,
      },
      {
        href: "/viewer/services",
        label: "Services",
        description: "Inventory of monitored services.",
        icon: Server,
      },
      {
        href: "/viewer/reports",
        label: "Reports",
        description: "Operational summaries and downloads.",
        icon: FileText,
      },
    ],
  },
  {
    title: "Knowledge",
    items: [
      {
        href: "/viewer/docs",
        label: "Docs",
        description: "Reference guides and runbooks.",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        href: "/viewer/settings",
        label: "Settings",
        description: "Profile preferences and access notes.",
        icon: Settings,
      },
    ],
  },
];

const quickActions: PortalQuickAction[] = [
  { href: "/viewer/alerts", label: "Alert Feed", icon: BellRing },
  { href: "/viewer/services", label: "Service List", icon: Server },
  { href: "/viewer/docs", label: "Docs", icon: BookOpen },
];

export default function ViewerLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${portalHead.variable} ${portalBody.variable}`}>
      <RoleShell
        themeClassName="viewer-portal"
        portalLabel="Viewer Console"
        portalTitle="Signal Lens"
        portalDescription="Track uptime and read alerts without elevated controls."
        navSections={navSections}
        quickActions={quickActions}
        minimumRole="viewer"
        BrandIcon={MonitorCheck}
      >
        {children}
      </RoleShell>
    </div>
  );
}
