"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Globe, RefreshCw, Search, Clock, Zap, AlertTriangle, CheckCircle, Eye } from "lucide-react";

type WebsiteProbeResult = {
  targetUrl: string;
  finalUrl: string;
  checkedAt: string;
  available: boolean;
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  responseSizeBytes: number | null;
  contentType: string;
  title: string;
  contentMetrics: {
    links: number;
    images: number;
    scripts: number;
    forms: number;
    headings: number;
  };
  securityHeaders: {
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    referrerPolicy: boolean;
  };
  metricsEndpoint: {
    checked: boolean;
    available: boolean;
    endpoint: string;
    statusCode?: number;
    metricCount?: number;
    sampleMetricNames?: string[];
  };
};

type WebsiteEntry = {
  url: string;
  name: string;
  lastCheck?: WebsiteProbeResult | null;
  status: "checking" | "online" | "offline" | "error";
};

export default function ViewerWebsitesPage() {
  const [websites, setWebsites] = useState<WebsiteEntry[]>([
    { url: "https://google.com", name: "Google", status: "checking" },
    { url: "https://github.com", name: "GitHub", status: "checking" },
    { url: "https://stackoverflow.com", name: "Stack Overflow", status: "checking" },
  ]);
  const [search, setSearch] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const checkWebsite = useCallback(async (website: WebsiteEntry): Promise<WebsiteProbeResult | null> => {
    try {
      const response = await authenticatedFetch(`/api/prometheus/website?url=${encodeURIComponent(website.url)}&timeoutMs=10000`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json() as WebsiteProbeResult;
    } catch (error) {
      console.error(`Failed to check ${website.url}:`, error);
      return null;
    }
  }, []);

  const checkAllWebsites = useCallback(async () => {
    setIsChecking(true);
    setWebsites(prev => prev.map(w => ({ ...w, status: "checking" as const })));

    const results: WebsiteEntry[] = await Promise.all(
      websites.map(async (website) => {
        const result = await checkWebsite(website);
        return {
          ...website,
          lastCheck: result,
          status: result ? (result.available ? "online" as const : "offline" as const) : "error" as const,
        };
      })
    );

    setWebsites(results);
    setIsChecking(false);
  }, [websites, checkWebsite]);

  useEffect(() => {
    void checkAllWebsites();
    const interval = setInterval(checkAllWebsites, 120000); // Check every 2 minutes for viewers
    return () => clearInterval(interval);
  }, [checkAllWebsites]);

  const filteredWebsites = websites.filter(website =>
    website.name.toLowerCase().includes(search.toLowerCase()) ||
    website.url.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: WebsiteEntry["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "offline":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "checking":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = (status: WebsiteEntry["status"]) => {
    switch (status) {
      case "online":
        return "Online";
      case "offline":
        return "Offline";
      case "error":
        return "Error";
      case "checking":
        return "Checking...";
    }
  };

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Website monitoring</p>
            <h3 className="admin-title text-2xl">Performance overview</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              View website availability, response times, and performance metrics.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={checkAllWebsites}
              disabled={isChecking}
              className="admin-button-secondary flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--admin-muted)" />
            <input
              type="text"
              placeholder="Search websites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredWebsites.map((website) => (
            <div key={website.url} className="admin-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(website.status)}
                  <div>
                    <h4 className="font-semibold text-(--admin-foreground)">{website.name}</h4>
                    <p className="text-sm text-(--admin-muted)">{website.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {website.lastCheck && (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{website.lastCheck.responseTimeMs}ms</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4" />
                        <span>{website.lastCheck.statusCode}</span>
                      </div>
                    </>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    website.status === "online" ? "bg-green-100 text-green-800" :
                    website.status === "offline" ? "bg-red-100 text-red-800" :
                    website.status === "error" ? "bg-orange-100 text-orange-800" :
                    "bg-blue-100 text-blue-800"
                  }`}>
                    {getStatusText(website.status)}
                  </span>
                </div>
              </div>

              {website.lastCheck && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-(--admin-muted)">Response Time</span>
                    <p className="font-semibold">{website.lastCheck.responseTimeMs}ms</p>
                  </div>
                  <div>
                    <span className="text-(--admin-muted)">Status Code</span>
                    <p className="font-semibold">{website.lastCheck.statusCode}</p>
                  </div>
                  <div>
                    <span className="text-(--admin-muted)">Content Size</span>
                    <p className="font-semibold">
                      {website.lastCheck.responseSizeBytes ?
                        `${(website.lastCheck.responseSizeBytes / 1024).toFixed(1)} KB` :
                        'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-(--admin-muted)">Last Checked</span>
                    <p className="font-semibold">
                      {new Date(website.lastCheck.checkedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}