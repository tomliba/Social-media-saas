export interface IpIntel {
  asn: string | null;
  asnOrg: string | null;
  country: string | null;
  isDatacenter: boolean | null;
  isProxy: boolean | null; // always null on the free Lite tier (see note)
}

// Keyword match against the ASN org name. Cheap, free, and good enough to flag
// the obvious cloud/hosting ranges that farmers use.
const DC_KEYWORDS = [
  "amazon", "aws", "google", "microsoft", "azure", "digitalocean", "ovh",
  "hetzner", "linode", "akamai", "cloudflare", "oracle", "vultr", "scaleway",
  "leaseweb", "contabo", "choopa", "hosting", "datacenter", "data center",
  "colo", "server", "vps", "m247", "datacamp", "g-core", "alibaba", "tencent",
];

export function isDatacenterOrg(org: string | undefined | null): boolean {
  if (!org) return false;
  const o = org.toLowerCase();
  return DC_KEYWORDS.some((k) => o.includes(k));
}

interface IpinfoLite {
  asn?: string;
  as_name?: string;
  as_domain?: string;
  country?: string;
  country_code?: string;
}

/**
 * Best-effort IP enrichment via ipinfo Lite (free, commercial-OK).
 * Returns null if no token is configured or the call fails/times out.
 */
export async function lookupIp(ip: string | null | undefined): Promise<IpIntel | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token || !ip || ip === "unknown") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}?token=${token}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const d = (await res.json()) as IpinfoLite;
    const asnOrg = d.as_name ?? null;
    return {
      asn: d.asn ?? null,
      asnOrg,
      country: d.country_code ?? d.country ?? null,
      isDatacenter: asnOrg ? isDatacenterOrg(asnOrg) : null,
      isProxy: null,
    };
  } catch {
    return null; // fail silent — enrichment must never block signup
  } finally {
    clearTimeout(timer);
  }
}
