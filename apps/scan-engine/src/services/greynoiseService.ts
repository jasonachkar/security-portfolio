import { getCache, setCache } from '../cache/memoryCache';

const CACHE_KEY = 'greynoise_noise';
const TTL = 15 * 60 * 1000; // 15 minutes

export interface NoiseIP {
  ip: string;
  classification: 'malicious' | 'benign' | 'unknown';
  country_code: string;
  name: string;
  last_seen: string;
  /** true when served from the bundled sample set rather than the live API. */
  sample?: boolean;
}

export async function getNoisyIPs(limit = 50): Promise<NoiseIP[]> {
  const cached = getCache<NoiseIP[]>(CACHE_KEY);
  if (cached) return cached.slice(0, limit);

  try {
    // GreyNoise Community API — no auth needed for basic queries.
    const res = await fetch(
      'https://api.greynoise.io/v3/community/ips?limit=100',
      {
        headers: {
          'User-Agent': 'security-portfolio/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) throw new Error(`GreyNoise API error: ${res.status}`);

    const json = (await res.json()) as any;
    const items: NoiseIP[] = (json.noise || []).map((ip: any) => ({
      ip: ip.ip,
      classification: ip.classification || 'unknown',
      country_code: ip.country_code || 'XX',
      name: ip.name || 'Unknown Actor',
      last_seen: ip.last_seen || new Date().toISOString(),
    }));

    if (items.length === 0) throw new Error('GreyNoise returned no items');

    setCache(CACHE_KEY, items, TTL);
    return items.slice(0, limit);
  } catch {
    // Fallback: curated, realistic sample data when the live feed is unavailable.
    return getSampleNoisyIPs(limit);
  }
}

function getSampleNoisyIPs(limit: number): NoiseIP[] {
  const now = new Date().toISOString();
  const samples: NoiseIP[] = [
    { ip: '45.227.255.206', classification: 'malicious', country_code: 'BR', name: 'Mirai Botnet', last_seen: now, sample: true },
    { ip: '185.220.101.34', classification: 'unknown', country_code: 'DE', name: 'Tor Exit Node', last_seen: now, sample: true },
    { ip: '198.199.105.250', classification: 'benign', country_code: 'US', name: 'Shodan Scanner', last_seen: now, sample: true },
    { ip: '80.82.77.139', classification: 'malicious', country_code: 'NL', name: 'Port Scanner', last_seen: now, sample: true },
    { ip: '162.243.24.154', classification: 'benign', country_code: 'US', name: 'Censys Research', last_seen: now, sample: true },
    { ip: '193.32.162.21', classification: 'malicious', country_code: 'RU', name: 'RDP Brute Force', last_seen: now, sample: true },
    { ip: '141.98.81.42', classification: 'malicious', country_code: 'LT', name: 'SSH Credential Stuffing', last_seen: now, sample: true },
    { ip: '89.248.165.74', classification: 'malicious', country_code: 'NL', name: 'Recyber Project Scanner', last_seen: now, sample: true },
    { ip: '167.94.138.34', classification: 'benign', country_code: 'US', name: 'Censys Research', last_seen: now, sample: true },
    { ip: '116.62.0.0', classification: 'malicious', country_code: 'CN', name: 'Web App Probe', last_seen: now, sample: true },
    { ip: '218.92.0.107', classification: 'malicious', country_code: 'CN', name: 'SSH Worm', last_seen: now, sample: true },
    { ip: '92.118.39.88', classification: 'unknown', country_code: 'GB', name: 'HTTP Crawler', last_seen: now, sample: true },
    { ip: '5.188.206.18', classification: 'malicious', country_code: 'RU', name: 'SMTP Spam Bot', last_seen: now, sample: true },
    { ip: '20.99.160.0', classification: 'benign', country_code: 'US', name: 'Microsoft Crawler', last_seen: now, sample: true },
    { ip: '34.123.45.67', classification: 'benign', country_code: 'US', name: 'Google Cloud Scanner', last_seen: now, sample: true },
    { ip: '103.155.92.10', classification: 'malicious', country_code: 'IN', name: 'Telnet Botnet', last_seen: now, sample: true },
    { ip: '210.245.92.30', classification: 'malicious', country_code: 'JP', name: 'IoT Exploit Attempt', last_seen: now, sample: true },
    { ip: '41.79.234.5', classification: 'unknown', country_code: 'ZA', name: 'Unknown Probe', last_seen: now, sample: true },
    { ip: '177.54.144.20', classification: 'malicious', country_code: 'BR', name: 'WordPress Login Brute', last_seen: now, sample: true },
    { ip: '13.107.42.14', classification: 'benign', country_code: 'US', name: 'Bing Crawler', last_seen: now, sample: true },
    { ip: '195.123.246.50', classification: 'malicious', country_code: 'UA', name: 'Phishing Infrastructure', last_seen: now, sample: true },
    { ip: '49.234.10.20', classification: 'malicious', country_code: 'CN', name: 'Redis Exploit Scanner', last_seen: now, sample: true },
    { ip: '156.146.59.25', classification: 'unknown', country_code: 'FR', name: 'VPN Egress', last_seen: now, sample: true },
    { ip: '200.89.178.4', classification: 'malicious', country_code: 'AR', name: 'Mirai Variant', last_seen: now, sample: true },
    { ip: '203.0.113.42', classification: 'unknown', country_code: 'AU', name: 'Generic Scanner', last_seen: now, sample: true },
  ];
  return samples.slice(0, limit);
}
