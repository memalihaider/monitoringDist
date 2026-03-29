import type { ReactNode } from "react";
import { Space_Grotesk, Work_Sans } from "next/font/google";
import AdminShell from "@/components/admin/admin-shell";

const adminDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-admin-head",
});

const adminBody = Work_Sans({
  subsets: ["latin"],
  variable: "--font-admin-body",
});

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${adminDisplay.variable} ${adminBody.variable}`}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
