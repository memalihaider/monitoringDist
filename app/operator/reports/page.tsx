"use client";

import { useMemo, useState } from "react";
import { Calendar, Download, FileText, Filter } from "lucide-react";

type ReportEntry = {
  id: number;
  name: string;
  date: string;
  type: "PDF" | "CSV";
  size: string;
};

export default function OperatorReportsPage() {
  const [formatFilter, setFormatFilter] = useState<"All" | "PDF" | "CSV">("All");

  const reports: ReportEntry[] = [
    { id: 1, name: "Weekly Uptime Summary", date: "Oct 24, 2023", type: "PDF", size: "2.4 MB" },
    { id: 2, name: "Monthly Performance Analysis", date: "Oct 01, 2023", type: "PDF", size: "5.1 MB" },
    { id: 3, name: "Incident Response Log", date: "Sep 28, 2023", type: "CSV", size: "1.2 MB" },
    { id: 4, name: "SLA Compliance Report", date: "Sep 15, 2023", type: "PDF", size: "3.8 MB" },
  ];

  const visibleReports = useMemo(() => {
    if (formatFilter === "All") {
      return reports;
    }
    return reports.filter((report) => report.type === formatFilter);
  }, [formatFilter, reports]);

  function handleDownload(report: ReportEntry) {
    const csv = [
      ["Name", "Generated", "Format", "Size"].join(","),
      [report.name, report.date, report.type, report.size].join(","),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Reporting</p>
            <h3 className="admin-title text-2xl">Operational reports</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Generate, review, and distribute readiness reports for daily operations.
            </p>
          </div>
          <button
            onClick={() =>
              setFormatFilter((current) =>
                current === "All" ? "PDF" : current === "PDF" ? "CSV" : "All",
              )
            }
            className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-4 py-2 text-xs font-semibold"
          >
            <Filter className="h-4 w-4" />
            Filter: {formatFilter}
          </button>
        </div>
      </section>

      <section className="admin-panel p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-(--admin-line) text-left text-xs uppercase tracking-widest text-(--admin-muted)">
                <th className="px-2 py-2 font-semibold">Report Name</th>
                <th className="px-2 py-2 font-semibold">Generated</th>
                <th className="px-2 py-2 font-semibold">Format</th>
                <th className="px-2 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report) => (
                <tr key={report.id} className="border-b border-(--admin-line)/60">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-(--admin-ink)">{report.name}</p>
                        <p className="text-xs text-(--admin-muted)">{report.size}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-xs text-(--admin-muted)">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {report.date}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span className="rounded-full border border-(--admin-line) px-2 py-1 text-xs font-semibold uppercase">
                      {report.type}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      onClick={() => handleDownload(report)}
                      className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
