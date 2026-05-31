import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// ALLOWED TARGETS ONLY — do not remove this list.
const ALLOWED_NMAP_TARGETS = [
  'scanme.nmap.org',
  '45.33.32.156', // scanme.nmap.org IP
];

export interface ScanResult {
  tool: string;
  target: string;
  startedAt: string;
  completedAt: string;
  raw: string;
  findings: ParsedFinding[];
  /** true when the tool binary was unavailable and output was simulated for the demo. */
  simulated: boolean;
}

export interface ParsedFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail: string;
}

async function hasBinary(bin: string): Promise<boolean> {
  try {
    await execAsync(`command -v ${bin}`);
    return true;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------- nmap --

export async function runNmap(
  target: string,
  flags = '-sV -T4 --top-ports 100'
): Promise<ScanResult> {
  if (!ALLOWED_NMAP_TARGETS.includes(target)) {
    throw new Error(`Target "${target}" is not in the allowed scan list.`);
  }

  const startedAt = new Date().toISOString();

  if (!(await hasBinary('nmap'))) {
    const raw = simulatedNmapRaw(target);
    return {
      tool: 'nmap',
      target,
      startedAt,
      completedAt: new Date().toISOString(),
      raw,
      findings: parseNmapOutput(raw),
      simulated: true,
    };
  }

  let raw = '';
  try {
    const { stdout, stderr } = await execAsync(`nmap ${flags} ${target}`, {
      timeout: 30000,
    });
    raw = stdout || stderr;
  } catch (e: any) {
    raw = e.stdout || e.message || 'Nmap execution failed';
  }

  return {
    tool: 'nmap',
    target,
    startedAt,
    completedAt: new Date().toISOString(),
    raw,
    findings: parseNmapOutput(raw),
    simulated: false,
  };
}

function simulatedNmapRaw(target: string): string {
  return [
    `Starting Nmap ( https://nmap.org ) against ${target}`,
    'Nmap scan report for ' + target + ' (45.33.32.156)',
    'Host is up (0.072s latency).',
    'Not shown: 96 closed tcp ports (reset)',
    'PORT      STATE SERVICE     VERSION',
    '22/tcp    open  ssh         OpenSSH 6.6.1p1 Ubuntu 2ubuntu2.13 (Ubuntu Linux; protocol 2.0)',
    '80/tcp    open  http        Apache httpd 2.4.7 ((Ubuntu))',
    '9929/tcp  open  nping-echo  Nping echo',
    '31337/tcp open  tcpwrapped',
    'Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel',
    '',
    '[ simulated output — nmap binary not installed in this environment ]',
  ].join('\n');
}

function parseNmapOutput(output: string): ParsedFinding[] {
  const findings: ParsedFinding[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const portMatch = line.match(/^(\d+)\/tcp\s+open\s+(\S+)\s*(.*)/);
    if (portMatch) {
      const port = portMatch[1];
      const service = portMatch[2];
      const version = (portMatch[3] || '').trim();

      let severity: ParsedFinding['severity'] = 'info';
      if (['22', '23', '3389', '5900'].includes(port)) severity = 'high';
      else if (['21', '25', '110', '143', '445', '3306', '5432'].includes(port))
        severity = 'medium';

      findings.push({
        severity,
        title: `Open Port ${port}/${service}`,
        detail: `Service: ${service}${
          version ? ` — Version: ${version}` : ''
        }. Port ${port} is open and accepting connections.`,
      });
    }
  }

  return findings;
}

// -------------------------------------------------------------------- trivy --

export async function runTrivy(target: string): Promise<ScanResult> {
  // Target should be a Docker image name like "nginx:latest".
  const safeTarget = target.replace(/[^a-zA-Z0-9:./\-_]/g, '');
  const startedAt = new Date().toISOString();

  if (!(await hasBinary('trivy'))) {
    const findings = simulatedTrivyFindings(safeTarget);
    return {
      tool: 'trivy',
      target: safeTarget,
      startedAt,
      completedAt: new Date().toISOString(),
      raw: JSON.stringify(
        { note: 'simulated — trivy binary not installed', findings },
        null,
        2
      ),
      findings,
      simulated: true,
    };
  }

  let raw = '';
  try {
    const { stdout } = await execAsync(
      `trivy image --format json --severity HIGH,CRITICAL --no-progress ${safeTarget}`,
      { timeout: 120000 }
    );
    raw = stdout;
  } catch (e: any) {
    raw = e.stdout || JSON.stringify({ error: e.message });
  }

  return {
    tool: 'trivy',
    target: safeTarget,
    startedAt,
    completedAt: new Date().toISOString(),
    raw,
    findings: parseTrivyOutput(raw),
    simulated: false,
  };
}

function parseTrivyOutput(output: string): ParsedFinding[] {
  try {
    const json = JSON.parse(output);
    const findings: ParsedFinding[] = [];

    for (const result of json.Results || []) {
      for (const vuln of result.Vulnerabilities || []) {
        findings.push({
          severity: (vuln.Severity || 'info').toLowerCase() as ParsedFinding['severity'],
          title: `${vuln.VulnerabilityID}: ${vuln.PkgName}@${vuln.InstalledVersion}`,
          detail: vuln.Description || vuln.Title || 'No description available',
        });
      }
    }
    return findings;
  } catch {
    return [
      {
        severity: 'info',
        title: 'Raw output available',
        detail: 'Could not parse JSON — see raw output',
      },
    ];
  }
}

function simulatedTrivyFindings(image: string): ParsedFinding[] {
  // Representative HIGH/CRITICAL package CVEs commonly seen in base images.
  const base: ParsedFinding[] = [
    { severity: 'critical', title: 'CVE-2023-4911: glibc@2.31-13', detail: 'Buffer overflow in the GNU C Library dynamic loader (ld.so) while processing the GLIBC_TUNABLES environment variable (Looney Tunables). Local privilege escalation to root.' },
    { severity: 'critical', title: 'CVE-2023-29491: ncurses@6.2', detail: 'Memory corruption in ncurses before 6.4 when used by a setuid application, potentially leading to privilege escalation.' },
    { severity: 'high', title: 'CVE-2023-5678: openssl@1.1.1f', detail: 'Generating excessively long X9.42 DH keys or checking such keys may be very slow, leading to a denial of service.' },
    { severity: 'high', title: 'CVE-2022-3602: openssl@3.0.0', detail: 'A 4-byte stack buffer overflow in X.509 certificate verification (punycode), potentially resulting in a crash or RCE.' },
    { severity: 'high', title: 'CVE-2023-0286: openssl@1.1.1f', detail: 'Type confusion in X.400 address processing inside an X.509 GeneralName, potentially leading to denial of service.' },
    { severity: 'high', title: 'CVE-2022-37434: zlib@1.2.11', detail: 'Heap-based buffer over-read or overflow in inflate() via a large gzip header extra field.' },
    { severity: 'high', title: 'CVE-2021-3711: openssl@1.1.1f', detail: 'SM2 decryption buffer overflow could allow an attacker to change application behaviour or crash the application.' },
  ];
  return base.map((f) => ({
    ...f,
    detail: `[image: ${image}] ${f.detail}`,
  }));
}

// ------------------------------------------------------------------ checkov --

export async function runCheckov(hclContent: string): Promise<ScanResult> {
  const startedAt = new Date().toISOString();

  if (!(await hasBinary('checkov'))) {
    const findings = simulatedCheckovFindings(hclContent);
    return {
      tool: 'checkov',
      target: 'terraform-hcl',
      startedAt,
      completedAt: new Date().toISOString(),
      raw: JSON.stringify(
        { note: 'simulated — checkov binary not installed', findings },
        null,
        2
      ),
      findings,
      simulated: true,
    };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'checkov-'));
  const tmpFile = path.join(tmpDir, 'main.tf');
  await fs.writeFile(tmpFile, hclContent, 'utf-8');

  let raw = '';
  try {
    const { stdout } = await execAsync(`checkov -f ${tmpFile} -o json --quiet`, {
      timeout: 30000,
    });
    raw = stdout;
  } catch (e: any) {
    raw = e.stdout || JSON.stringify({ error: e.message });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  return {
    tool: 'checkov',
    target: 'terraform-hcl',
    startedAt,
    completedAt: new Date().toISOString(),
    raw,
    findings: parseCheckovOutput(raw),
    simulated: false,
  };
}

function parseCheckovOutput(output: string): ParsedFinding[] {
  try {
    const json = JSON.parse(output);
    const results = json.results?.failed_checks || [];
    return results.map((c: any) => ({
      severity: 'medium' as const,
      title: `${c.check_id}: ${c.check?.name ?? c.check_name}`,
      detail: `Resource: ${c.resource}. ${c.check?.guideline || c.guideline || ''}`,
    }));
  } catch {
    return [];
  }
}

function simulatedCheckovFindings(hcl: string): ParsedFinding[] {
  // Pattern-match the supplied HCL so the simulated output reflects the input.
  const findings: ParsedFinding[] = [];
  const has = (re: RegExp) => re.test(hcl);

  if (has(/acl\s*=\s*"public-read"/)) {
    findings.push({ severity: 'high', title: 'CKV_AWS_20: S3 Bucket has an ACL defined which allows public READ access', detail: 'Resource: aws_s3_bucket_acl.bad_bucket_acl. Block public ACLs and use S3 Block Public Access.' });
  }
  if (has(/aws_s3_bucket"/) && !has(/server_side_encryption/)) {
    findings.push({ severity: 'high', title: 'CKV_AWS_19: Ensure all data stored in the S3 bucket is securely encrypted at rest', detail: 'Resource: aws_s3_bucket.bad_bucket. Enable SSE-S3 or SSE-KMS.' });
    findings.push({ severity: 'medium', title: 'CKV_AWS_21: Ensure all data stored in the S3 bucket has versioning enabled', detail: 'Resource: aws_s3_bucket.bad_bucket. Enable versioning to recover from accidental deletes.' });
  }
  if (has(/cidr_blocks\s*=\s*\["0\.0\.0\.0\/0"\]/)) {
    findings.push({ severity: 'critical', title: 'CKV_AWS_260: Ensure no security groups allow ingress from 0.0.0.0:0 to port -1', detail: 'Resource: aws_security_group.bad_sg. Restrict ingress to specific CIDRs and ports.' });
  }
  if (has(/publicly_accessible\s*=\s*true/)) {
    findings.push({ severity: 'high', title: 'CKV_AWS_17: Ensure all data stored in RDS is not publicly accessible', detail: 'Resource: aws_db_instance.bad_rds. Set publicly_accessible = false.' });
  }
  if (has(/aws_db_instance"/) && has(/storage_encrypted\s*=\s*false/)) {
    findings.push({ severity: 'high', title: 'CKV_AWS_16: Ensure all data stored in the RDS instance is encrypted', detail: 'Resource: aws_db_instance.bad_rds. Set storage_encrypted = true.' });
  }
  if (has(/password\s*=\s*"[^"]+"/)) {
    findings.push({ severity: 'critical', title: 'CKV_SECRET_6: Base64 / hardcoded credential detected', detail: 'A plaintext password is hardcoded in the configuration. Use a secrets manager or variable instead.' });
  }
  if (has(/skip_final_snapshot\s*=\s*true/)) {
    findings.push({ severity: 'low', title: 'CKV_AWS_118: Ensure that enhanced monitoring / final snapshot is configured', detail: 'Resource: aws_db_instance.bad_rds. skip_final_snapshot = true risks data loss on deletion.' });
  }

  if (findings.length === 0) {
    findings.push({ severity: 'info', title: 'No misconfigurations matched the simulated ruleset', detail: 'The supplied Terraform did not match any of the demo Checkov patterns.' });
  }
  return findings;
}
