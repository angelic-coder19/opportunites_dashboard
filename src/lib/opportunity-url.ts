// src/lib/opportunity-url.ts
// Human-readable public URLs for opportunities (title slug + short id suffix).

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID_SUFFIX_RE = /-([a-f0-9]{8})$/i;

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/, "");
}

export function opportunityShortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toLowerCase();
}

export function opportunityPublicSlug(id: string, title: string): string {
  const titleSlug = slugifyTitle(title) || "opportunity";
  return `${titleSlug}-${opportunityShortId(id)}`;
}

export function opportunityPublicPath(id: string, title: string): string {
  return `/opportunity/${opportunityPublicSlug(id, title)}`;
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://opportunites-dashboard.vercel.app"
  );
}

export function opportunityPublicUrl(id: string, title: string): string {
  return `${appBaseUrl()}${opportunityPublicPath(id, title)}`;
}

export function isUuidParam(param: string): boolean {
  return UUID_RE.test(param);
}

export function parseShortIdFromSlug(param: string): string | null {
  const match = param.match(SHORT_ID_SUFFIX_RE);
  return match?.[1]?.toLowerCase() ?? null;
}
