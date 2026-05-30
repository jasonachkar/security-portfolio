import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface Finding {
  tool: string;
  severity: Severity;
  title: string;
  file?: string;
  line?: number;
  cwe?: string;
  message: string;
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const scansDir = join(repoRoot, 'evidence', 'scans');
const generatedDir = join(repoRoot, 'apps', 'reviewer-ui', 'src', 'data', 'generated');

function safeJson(path: string): any | null {
  if (!existsSync(path)) {
    return null;
  }
  const content = readFileSync(path, 'utf8').trim();
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function normalizeSeverity(value: unknown): Severity {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('critical')) return 'critical';
  if (text.includes('high') || text === 'error') return 'high';
  if (text.includes('medium') || text === 'warning' || text === 'warn') return 'medium';
  if (text.includes('low')) return 'low';
  return 'info';
}

function truncate(value: unknown, max = 220): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function parseSemgrep(path: string): Finding[] {
  const raw = safeJson(path);
  return (raw?.results ?? []).map((result: any) => ({
    tool: 'semgrep',
    severity: normalizeSeverity(result.extra?.severity),
    title: result.check_id ?? 'semgrep-finding',
    file: result.path,
    line: result.start?.line,
    cwe: Array.isArray(result.extra?.metadata?.cwe)
      ? result.extra.metadata.cwe[0]
      : result.extra?.metadata?.cwe,
    message: truncate(result.extra?.message),
  }));
}

function parseGitleaks(path: string): Finding[] {
  const raw = safeJson(path);
  return (Array.isArray(raw) ? raw : []).map((result: any) => ({
    tool: 'gitleaks',
    severity: 'high',
    title: result.RuleID ?? 'secret-detected',
    file: result.File,
    line: result.StartLine,
    message: truncate(`Secret type: ${result.Description ?? 'unknown'}`),
  }));
}

function parseTrivy(path: string): Finding[] {
  const raw = safeJson(path);
  const findings: Finding[] = [];
  for (const result of raw?.Results ?? []) {
    for (const vulnerability of result.Vulnerabilities ?? []) {
      findings.push({
        tool: 'trivy',
        severity: normalizeSeverity(vulnerability.Severity),
        title: vulnerability.VulnerabilityID ?? 'dependency-vulnerability',
        file: result.Target,
        cwe: vulnerability.CweIDs?.[0],
        message: truncate(vulnerability.Title ?? vulnerability.Description),
      });
    }
    for (const misconfiguration of result.Misconfigurations ?? []) {
      findings.push({
        tool: 'trivy',
        severity: normalizeSeverity(misconfiguration.Severity),
        title: misconfiguration.ID ?? 'misconfiguration',
        file: result.Target,
        message: truncate(misconfiguration.Title ?? misconfiguration.Description),
      });
    }
  }
  return findings;
}

function parseBandit(path: string): Finding[] {
  const raw = safeJson(path);
  return (raw?.results ?? []).map((result: any) => ({
    tool: 'bandit',
    severity: normalizeSeverity(result.issue_severity),
    title: result.test_id ?? 'bandit-finding',
    file: result.filename,
    line: result.line_number,
    cwe: result.issue_cwe?.id ? `CWE-${result.issue_cwe.id}` : undefined,
    message: truncate(result.issue_text),
  }));
}

function parseZap(path: string): Finding[] {
  const raw = safeJson(path);
  const alerts = Array.isArray(raw?.site)
    ? raw.site.flatMap((site: any) => site.alerts ?? [])
    : Array.isArray(raw?.alerts)
      ? raw.alerts
      : [];
  return alerts.map((alert: any) => ({
    tool: 'zap',
    severity: normalizeSeverity(alert.riskdesc ?? alert.risk),
    title: alert.alert ?? alert.name ?? 'zap-alert',
    file: alert.url ?? alert.instances?.[0]?.uri,
    cwe: alert.cweid && String(alert.cweid) !== '-1' ? `CWE-${alert.cweid}` : undefined,
    message: truncate(alert.desc ?? alert.description ?? alert.solution),
  }));
}

const allFindings: Finding[] = [
  ...parseSemgrep(join(scansDir, 'semgrep.json')),
  ...parseGitleaks(join(scansDir, 'gitleaks.json')),
  ...parseTrivy(join(scansDir, 'trivy-fs.json')),
  ...parseBandit(join(scansDir, 'bandit.json')),
  ...parseZap(join(scansDir, 'zap-reviewer-ui.json')),
];

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const bySeverity = allFindings.reduce<Record<Severity, number>>(
  (acc, finding) => {
    acc[finding.severity] += 1;
    return acc;
  },
  { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
);

const byTool = allFindings.reduce<Record<string, number>>((acc, finding) => {
  acc[finding.tool] = (acc[finding.tool] ?? 0) + 1;
  return acc;
}, {});

const summary = {
  generatedAt: new Date().toISOString(),
  sourceDirectory: 'evidence/scans',
  totalFindings: allFindings.length,
  bySeverity,
  byTool,
  topFindings: allFindings
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 20),
};

mkdirSync(scansDir, { recursive: true });
mkdirSync(generatedDir, { recursive: true });

const moduleText =
  `// AUTO-GENERATED by scripts/summarize-scans.ts - DO NOT EDIT\n` +
  `// Reflects scanner JSON files committed under evidence/scans.\n` +
  `// Last generated: ${summary.generatedAt}\n\n` +
  `export type ScanSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';\n\n` +
  `export interface ScanFinding {\n` +
  `  tool: string;\n` +
  `  severity: ScanSeverity;\n` +
  `  title: string;\n` +
  `  file?: string;\n` +
  `  line?: number;\n` +
  `  cwe?: string;\n` +
  `  message: string;\n` +
  `}\n\n` +
  `export interface ScanSummary {\n` +
  `  generatedAt: string;\n` +
  `  sourceDirectory: string;\n` +
  `  totalFindings: number;\n` +
  `  bySeverity: Record<ScanSeverity, number>;\n` +
  `  byTool: Record<string, number>;\n` +
  `  topFindings: ScanFinding[];\n` +
  `}\n\n` +
  `export const SCAN_SUMMARY: ScanSummary = ${JSON.stringify(summary, null, 2)};\n`;

writeFileSync(join(scansDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(join(scansDir, 'summary.ts'), moduleText);
writeFileSync(join(generatedDir, 'scanSummary.ts'), moduleText);

console.log(`Scan summary written: ${summary.totalFindings} findings`);
console.log(`UI copy: ${relative(repoRoot, join(generatedDir, 'scanSummary.ts'))}`);
