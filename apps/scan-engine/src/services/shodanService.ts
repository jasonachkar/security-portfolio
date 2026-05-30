import { getCache, setCache } from '../cache/memoryCache';

const TTL = 30 * 60 * 1000;

export interface HostInfo {
  ip: string;
  ports: number[];
  cpes: string[];
  tags: string[];
  vulns: string[];
}

export async function getInternetDBInfo(ip: string): Promise<HostInfo> {
  const cacheKey = `shodan_${ip}`;
  const cached = getCache<HostInfo>(cacheKey);
  if (cached) return cached;

  try {
    // Shodan InternetDB is free and requires no API key.
    const res = await fetch(`https://internetdb.shodan.io/${ip}`, {
      headers: { 'User-Agent': 'security-portfolio/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { ip, ports: [], cpes: [], tags: [], vulns: [] };
    }

    const json = (await res.json()) as any;
    const info: HostInfo = {
      ip,
      ports: json.ports || [],
      cpes: json.cpes || [],
      tags: json.tags || [],
      vulns: json.vulns || [],
    };

    setCache(cacheKey, info, TTL);
    return info;
  } catch {
    return { ip, ports: [], cpes: [], tags: [], vulns: [] };
  }
}
