type WebsiteContentMetrics = {
  links: number;
  images: number;
  scripts: number;
  forms: number;
  headings: number;
};

type WebsiteSecurityHeaders = {
  strictTransportSecurity: boolean;
  contentSecurityPolicy: boolean;
  xContentTypeOptions: boolean;
  xFrameOptions: boolean;
  referrerPolicy: boolean;
};

type WebsiteMetricsEndpoint = {
  checked: boolean;
  available: boolean;
  endpoint: string;
  statusCode?: number;
  metricCount?: number;
  sampleMetricNames?: string[];
};

export type WebsiteProbeResult = {
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
  contentMetrics: WebsiteContentMetrics;
  securityHeaders: WebsiteSecurityHeaders;
  metricsEndpoint: WebsiteMetricsEndpoint;
};

function normalizeTargetUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol);
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) {
    return "";
  }
  return match[1].replace(/\s+/g, " ").trim();
}

function countMatches(content: string, pattern: RegExp) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function toMetricNames(metricsPayload: string) {
  const metricNames = new Set<string>();

  for (const line of metricsPayload.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/);
    if (match) {
      metricNames.add(match[1]);
    }
  }

  return [...metricNames];
}

async function checkMetricsEndpoint(baseUrl: URL, timeoutMs: number): Promise<WebsiteMetricsEndpoint> {
  if (baseUrl.pathname === "/metrics") {
    return {
      checked: false,
      available: false,
      endpoint: baseUrl.toString(),
    };
  }

  const endpointUrl = new URL("/metrics", baseUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        Accept: "text/plain, */*",
        "User-Agent": "MonitoringSolutions/1.0 (+website-probe)",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    const endpointResult: WebsiteMetricsEndpoint = {
      checked: true,
      available: response.ok,
      endpoint: endpointUrl.toString(),
      statusCode: response.status,
    };

    if (!response.ok) {
      return endpointResult;
    }

    const metricsBody = await response.text();
    const metricNames = toMetricNames(metricsBody);

    return {
      ...endpointResult,
      metricCount: metricNames.length,
      sampleMetricNames: metricNames.slice(0, 8),
    };
  } catch {
    return {
      checked: true,
      available: false,
      endpoint: endpointUrl.toString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function probeWebsite(target: string, timeoutMs = 15000): Promise<WebsiteProbeResult> {
  const normalizedUrl = normalizeTargetUrl(target);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(normalizedUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,application/json,text/plain,*/*",
        "User-Agent": "MonitoringSolutions/1.0 (+website-probe)",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    const responseTimeMs = Date.now() - startedAt;
    const contentType = response.headers.get("content-type") ?? "";
    const contentLengthHeader = response.headers.get("content-length");

    let bodyText = "";
    if (contentType.includes("text/") || contentType.includes("json") || contentType.includes("xml")) {
      bodyText = await response.text();
    }

    const computedBodyLength = bodyText.length > 0 ? Buffer.byteLength(bodyText, "utf8") : null;
    const responseSizeBytes = contentLengthHeader
      ? Number.parseInt(contentLengthHeader, 10)
      : computedBodyLength;

    const contentMetrics: WebsiteContentMetrics = {
      links: countMatches(bodyText, /<a\b/gi),
      images: countMatches(bodyText, /<img\b/gi),
      scripts: countMatches(bodyText, /<script\b/gi),
      forms: countMatches(bodyText, /<form\b/gi),
      headings: countMatches(bodyText, /<h[1-6]\b/gi),
    };

    const securityHeaders: WebsiteSecurityHeaders = {
      strictTransportSecurity: Boolean(response.headers.get("strict-transport-security")),
      contentSecurityPolicy: Boolean(response.headers.get("content-security-policy")),
      xContentTypeOptions: Boolean(response.headers.get("x-content-type-options")),
      xFrameOptions: Boolean(response.headers.get("x-frame-options")),
      referrerPolicy: Boolean(response.headers.get("referrer-policy")),
    };

    const metricsEndpoint = await checkMetricsEndpoint(new URL(response.url), timeoutMs);

    return {
      targetUrl: normalizedUrl.toString(),
      finalUrl: response.url,
      checkedAt: new Date().toISOString(),
      available: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      responseTimeMs,
      responseSizeBytes,
      contentType,
      title: extractHtmlTitle(bodyText),
      contentMetrics,
      securityHeaders,
      metricsEndpoint,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
