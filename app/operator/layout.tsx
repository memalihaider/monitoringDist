"use client";

import type { ReactNode } from "react";
import { Manrope, Sora } from "next/font/google";
import {
  Activity,
  BellRing,
  BookOpen,
  FileText,
  Globe,
  LayoutDashboard,
  Server,
  Settings,
} from "lucide-react";
import RoleShell, { type PortalNavSection, type PortalQuickAction } from "@/components/portal/role-shell";

const portalHead = Sora({
  subsets: ["latin"],
  variable: "--font-admin-head",
});

const portalBody = Manrope({
  subsets: ["latin"],
  variable: "--font-admin-body",
});

const navSections: PortalNavSection[] = [
  {
    title: "Command",
    items: [
      {
        href: "/operator/dashboard",
        label: "Dashboard",
        description: "Operational health and live posture.",
        icon: LayoutDashboard,
      },
      {
        href: "/operator/alerts",
        label: "Alerts",
        description: "Triage incidents and acknowledge response.",
        icon: BellRing,
      },
      {
        href: "/operator/services",
        label: "Services",
        description: "Service registry and uptime checks.",
        icon: Server,
      },
      {
        href: "/operator/websites",
        label: "Websites",
        description: "Website performance and uptime monitoring.",
        icon: Globe,
      },
      {
        href: "/operator/reports",
        label: "Reports",
        description: "Generate readiness and SLA briefs.",
        icon: FileText,
      },
    ],
  },
  {
    title: "Knowledge",
    items: [
      {
        href: "/operator/docs",
        label: "Docs",
        description: "Runbooks and operational guides.",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Controls",
    items: [
      {
        href: "/operator/settings",
        label: "Settings",
        description: "Notification and workflow controls.",
        icon: Settings,
      },
    ],
  },
];

const quickActions: PortalQuickAction[] = [
  { href: "/operator/alerts", label: "Alert Desk", icon: BellRing },
  { href: "/operator/services", label: "Service Grid", icon: Server },
  { href: "/operator/docs", label: "Runbooks", icon: BookOpen },
];

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${portalHead.variable} ${portalBody.variable}`}>
      <RoleShell
        themeClassName="ops-portal"
        portalLabel="Operator Control"
        portalTitle="Operations Deck"
        portalDescription="Coordinate incidents, monitor uptime, and keep the fleet stable."
        navSections={navSections}
        quickActions={quickActions}
        minimumRole="operator"
        BrandIcon={Activity}
      >
        {children}
      </RoleShell>
    </div>
  );
}
