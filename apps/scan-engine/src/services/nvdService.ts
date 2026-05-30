import { getCache, setCache } from '../cache/memoryCache';

const NVD_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const CACHE_KEY = 'nvd_recent_cves';
const TTL = 60 * 60 * 1000; // 1 hour

export interface CVEItem {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  publishedDate: string;
  references: string[];
  /** true when this entry is served from the bundled sample set rather than the live API. */
  sample?: boolean;
}

function mapSeverity(score: number | null): CVEItem['severity'] {
  if (score === null) return 'NONE';
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  return 'LOW';
}

export async function getRecentCVEs(limit = 20): Promise<CVEItem[]> {
  const cached = getCache<CVEItem[]>(CACHE_KEY);
  if (cached) return cached.slice(0, limit);

  const params = new URLSearchParams({
    resultsPerPage: '50',
    startIndex: '0',
  });

  try {
    const res = await fetch(`${NVD_BASE}?${params}`, {
      headers: { 'User-Agent': 'security-portfolio/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`NVD API error: ${res.status}`);

    const json = (await res.json()) as any;
    const items: CVEItem[] = (json.vulnerabilities || []).map((v: any) => {
      const cve = v.cve;
      const desc =
        cve.descriptions?.find((d: any) => d.lang === 'en')?.value || '';
      const metrics =
        cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV2?.[0];
      const score = metrics?.cvssData?.baseScore ?? null;
      return {
        id: cve.id,
        description: desc,
        cvssScore: score,
        severity: mapSeverity(score),
        publishedDate: cve.published,
        references: (cve.references || []).slice(0, 3).map((r: any) => r.url),
      };
    });

    if (items.length === 0) throw new Error('NVD returned no items');

    setCache(CACHE_KEY, items, TTL);
    return items.slice(0, limit);
  } catch {
    // Network/feed unavailable — serve the bundled sample so the UI always has data.
    return getSampleCVEs().slice(0, limit);
  }
}

/**
 * Curated sample of well-known, real published CVEs. Used as a fallback when the
 * live NVD feed cannot be reached (e.g. restricted network). Clearly flagged via
 * the `sample` field so the UI can label it honestly.
 */
function getSampleCVEs(): CVEItem[] {
  const ref = (id: string) => [`https://nvd.nist.gov/vuln/detail/${id}`];
  return [
    { id: 'CVE-2024-3094', description: 'Malicious backdoor discovered in the upstream xz/liblzma 5.6.0 and 5.6.1 release tarballs, allowing SSH authentication bypass / remote code execution on affected systems.', cvssScore: 10.0, severity: 'CRITICAL', publishedDate: '2024-03-29T00:15:00.000', references: ref('CVE-2024-3094'), sample: true },
    { id: 'CVE-2021-44228', description: 'Apache Log4j2 JNDI features used in configuration, log messages, and parameters do not protect against attacker-controlled LDAP and other JNDI related endpoints (Log4Shell).', cvssScore: 10.0, severity: 'CRITICAL', publishedDate: '2021-12-10T10:15:00.000', references: ref('CVE-2021-44228'), sample: true },
    { id: 'CVE-2023-44487', description: 'The HTTP/2 protocol allows a denial of service (server resource consumption) because request cancellation can reset many streams quickly (HTTP/2 Rapid Reset).', cvssScore: 7.5, severity: 'HIGH', publishedDate: '2023-10-10T14:15:00.000', references: ref('CVE-2023-44487'), sample: true },
    { id: 'CVE-2022-22965', description: 'A Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable to remote code execution via data binding (Spring4Shell).', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2022-04-01T23:15:00.000', references: ref('CVE-2022-22965'), sample: true },
    { id: 'CVE-2014-0160', description: 'The TLS heartbeat extension in OpenSSL 1.0.1 before 1.0.1g allows remote attackers to obtain sensitive information from process memory (Heartbleed).', cvssScore: 7.5, severity: 'HIGH', publishedDate: '2014-04-07T22:55:00.000', references: ref('CVE-2014-0160'), sample: true },
    { id: 'CVE-2017-0144', description: 'The SMBv1 server in Microsoft Windows allows remote attackers to execute arbitrary code via crafted packets (EternalBlue).', cvssScore: 8.1, severity: 'HIGH', publishedDate: '2017-03-16T17:59:00.000', references: ref('CVE-2017-0144'), sample: true },
    { id: 'CVE-2019-0708', description: 'A remote code execution vulnerability exists in Remote Desktop Services when an unauthenticated attacker connects using RDP and sends crafted requests (BlueKeep).', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2019-05-16T19:29:00.000', references: ref('CVE-2019-0708'), sample: true },
    { id: 'CVE-2021-34527', description: 'Windows Print Spooler allows remote code execution when it improperly performs privileged file operations (PrintNightmare).', cvssScore: 8.8, severity: 'HIGH', publishedDate: '2021-07-02T21:15:00.000', references: ref('CVE-2021-34527'), sample: true },
    { id: 'CVE-2023-23397', description: 'Microsoft Outlook elevation of privilege vulnerability that can leak Net-NTLMv2 hashes via a crafted reminder, requiring no user interaction.', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2023-03-14T17:15:00.000', references: ref('CVE-2023-23397'), sample: true },
    { id: 'CVE-2022-0847', description: 'A flaw in the Linux kernel pipe subsystem allowed overwriting data in arbitrary read-only files, leading to privilege escalation (Dirty Pipe).', cvssScore: 7.8, severity: 'HIGH', publishedDate: '2022-03-10T17:44:00.000', references: ref('CVE-2022-0847'), sample: true },
    { id: 'CVE-2020-1472', description: 'An elevation of privilege vulnerability in the Netlogon Remote Protocol (MS-NRPC) allows domain controller takeover (Zerologon).', cvssScore: 10.0, severity: 'CRITICAL', publishedDate: '2020-08-17T19:15:00.000', references: ref('CVE-2020-1472'), sample: true },
    { id: 'CVE-2018-7600', description: 'Drupal core allows remote attackers to execute arbitrary code because of an issue affecting multiple subsystems with default or common configurations (Drupalgeddon2).', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2018-03-29T15:29:00.000', references: ref('CVE-2018-7600'), sample: true },
    { id: 'CVE-2023-4863', description: 'Heap buffer overflow in libwebp in Google Chrome allowed a remote attacker to perform an out-of-bounds memory write via a crafted WebP image.', cvssScore: 8.8, severity: 'HIGH', publishedDate: '2023-09-12T15:15:00.000', references: ref('CVE-2023-4863'), sample: true },
    { id: 'CVE-2022-30190', description: 'A remote code execution vulnerability exists when MSDT is called using the URL protocol from a calling application such as Word (Follina).', cvssScore: 7.8, severity: 'HIGH', publishedDate: '2022-06-01T13:15:00.000', references: ref('CVE-2022-30190'), sample: true },
    { id: 'CVE-2021-26855', description: 'Microsoft Exchange Server server-side request forgery (SSRF) vulnerability allowing authentication bypass (ProxyLogon).', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2021-03-02T20:15:00.000', references: ref('CVE-2021-26855'), sample: true },
    { id: 'CVE-2024-21413', description: 'Microsoft Outlook remote code execution vulnerability that can bypass the Protected View by abusing the file:// scheme (MonikerLink).', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2024-02-13T18:15:00.000', references: ref('CVE-2024-21413'), sample: true },
    { id: 'CVE-2023-34362', description: 'A SQL injection vulnerability in Progress MOVEit Transfer allowed escalated privileges and unauthorized data access, widely exploited by ransomware actors.', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2023-06-02T06:15:00.000', references: ref('CVE-2023-34362'), sample: true },
    { id: 'CVE-2022-1388', description: 'F5 BIG-IP iControl REST authentication bypass allowing unauthenticated attackers to execute arbitrary system commands.', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2022-05-05T16:15:00.000', references: ref('CVE-2022-1388'), sample: true },
    { id: 'CVE-2021-45046', description: 'An incomplete fix for CVE-2021-44228 in certain non-default configurations allowed a denial of service and limited remote code execution in Apache Log4j2.', cvssScore: 9.0, severity: 'CRITICAL', publishedDate: '2021-12-14T19:15:00.000', references: ref('CVE-2021-45046'), sample: true },
    { id: 'CVE-2019-19781', description: 'Citrix Application Delivery Controller and Gateway directory traversal allowing unauthenticated remote code execution.', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2019-12-27T19:15:00.000', references: ref('CVE-2019-19781'), sample: true },
    { id: 'CVE-2023-2868', description: 'A remote command injection vulnerability in Barracuda Email Security Gateway via specially crafted TAR file attachments.', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2023-05-24T17:15:00.000', references: ref('CVE-2023-2868'), sample: true },
    { id: 'CVE-2020-5902', description: 'F5 BIG-IP Traffic Management User Interface remote code execution via directory traversal in undisclosed pages.', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2020-07-01T15:15:00.000', references: ref('CVE-2020-5902'), sample: true },
    { id: 'CVE-2018-11776', description: 'Apache Struts remote code execution possible when using results with no namespace and certain configurations.', cvssScore: 8.1, severity: 'HIGH', publishedDate: '2018-08-22T13:29:00.000', references: ref('CVE-2018-11776'), sample: true },
    { id: 'CVE-2024-23222', description: 'Apple WebKit type confusion issue that may lead to arbitrary code execution when processing maliciously crafted web content.', cvssScore: 8.8, severity: 'HIGH', publishedDate: '2024-01-23T21:15:00.000', references: ref('CVE-2024-23222'), sample: true },
    { id: 'CVE-2022-26134', description: 'Atlassian Confluence Server and Data Center OGNL injection allowing an unauthenticated attacker to execute arbitrary code.', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2022-06-03T20:15:00.000', references: ref('CVE-2022-26134'), sample: true },
    { id: 'CVE-2023-20198', description: 'Cisco IOS XE Web UI privilege escalation allowing an unauthenticated remote attacker to create an account with the highest privilege level.', cvssScore: 10.0, severity: 'CRITICAL', publishedDate: '2023-10-16T16:15:00.000', references: ref('CVE-2023-20198'), sample: true },
    { id: 'CVE-2021-3156', description: 'Sudo heap-based buffer overflow allowing privilege escalation to root via sudoedit -s and a command-line argument ending in a backslash (Baron Samedit).', cvssScore: 7.8, severity: 'HIGH', publishedDate: '2021-01-26T18:15:00.000', references: ref('CVE-2021-3156'), sample: true },
    { id: 'CVE-2017-5638', description: 'Apache Struts Jakarta Multipart parser remote code execution via crafted Content-Type, Content-Disposition, or Content-Length header.', cvssScore: 10.0, severity: 'CRITICAL', publishedDate: '2017-03-11T02:59:00.000', references: ref('CVE-2017-5638'), sample: true },
    { id: 'CVE-2024-1086', description: 'A use-after-free in the Linux kernel netfilter nf_tables component allows local privilege escalation to root.', cvssScore: 7.8, severity: 'HIGH', publishedDate: '2024-01-31T13:15:00.000', references: ref('CVE-2024-1086'), sample: true },
    { id: 'CVE-2022-42889', description: 'Apache Commons Text variable interpolation could result in remote code execution when untrusted input is evaluated (Text4Shell).', cvssScore: 9.8, severity: 'CRITICAL', publishedDate: '2022-10-13T20:15:00.000', references: ref('CVE-2022-42889'), sample: true },
  ];
}
