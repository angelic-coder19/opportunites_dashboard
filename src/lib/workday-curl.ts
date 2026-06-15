// Parse a DevTools "Copy as cURL" command for Workday searchJobs requests.

export interface ParsedWorkdayCurl {
  token?: string;
  cookie?: string;
  referer?: string;
  userAgent?: string;
  workdayClient?: string;
  headers: Record<string, string>;
}

function normalizeCurlInput(curl: string): string {
  return curl.replace(/\\\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseHeaderLine(line: string): { key: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon <= 0) return null;
  return {
    key: line.slice(0, colon).trim().toLowerCase(),
    value: line.slice(colon + 1).trim(),
  };
}

export function parseWorkdayCurl(curl: string): ParsedWorkdayCurl {
  const normalized = normalizeCurlInput(curl);
  const headers: Record<string, string> = {};

  const headerRe = /(?:^|\s)(?:-H|--header)\s+((['"])([\s\S]*?)\2)/g;
  let match: RegExpExecArray | null;
  while ((match = headerRe.exec(normalized)) !== null) {
    const parsed = parseHeaderLine(unquote(match[1]));
    if (parsed) headers[parsed.key] = parsed.value;
  }

  const cookieFlagRe = /(?:^|\s)(?:-b|--cookie)\s+((['"])([\s\S]*?)\2)/;
  const cookieMatch = normalized.match(cookieFlagRe);
  const cookieFromFlag = cookieMatch ? unquote(cookieMatch[1]) : undefined;

  const cookie = headers.cookie ?? cookieFromFlag;
  if (cookie) headers.cookie = cookie;

  return {
    token: headers["session-secure-token"],
    cookie,
    referer: headers.referer,
    userAgent: headers["user-agent"],
    workdayClient: headers["x-workday-client"],
    headers,
  };
}

export function curlToWorkdaySession(curl: string): {
  session: {
    token: string;
    cookie?: string;
    referer?: string;
    userAgent?: string;
    workdayClient?: string;
    headers: Record<string, string>;
  };
  error?: string;
} {
  const parsed = parseWorkdayCurl(curl);
  const token = parsed.token?.trim();
  if (!token) {
    return {
      session: { token: "", headers: parsed.headers },
      error:
        "Could not find session-secure-token in the cURL. Copy cURL from a searchJobs request in DevTools.",
    };
  }

  return {
    session: {
      token,
      cookie: parsed.cookie,
      referer: parsed.referer,
      userAgent: parsed.userAgent,
      workdayClient: parsed.workdayClient,
      headers: parsed.headers,
    },
  };
}
