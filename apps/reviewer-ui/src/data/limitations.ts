/**
 * Shared honest-language constants. These are deliberately phrased so the
 * no-overclaiming test passes: every boundary is stated as a negation
 * ("not a production SOC"), never as a positive overclaim.
 */

export interface Limitation {
  title: string;
  detail: string;
}

export const CORE_LIMITATIONS: Limitation[] = [
  {
    title: 'Not a production SOC',
    detail:
      'This is a portfolio lab, not a staffed operations centre and not a real-time SOC. There is no on-call, alerting pipeline, or 24/7 monitoring.',
  },
  {
    title: 'Not an arbitrary target scanner',
    detail:
      'Active scanning is restricted to an allowlist of local/demo targets. It is not a tool for scanning arbitrary public targets and performs no exploitation.',
  },
  {
    title: 'Cloud-demo uses sample data',
    detail:
      'The Azure cloud-demo defaults to seeded scanner and network data. It demonstrates architecture and review workflows, not live cloud scanning.',
  },
  {
    title: 'Active tools are local-lab by default',
    detail:
      'ZAP, Nmap, Trivy, and tshark execution run in the local full-tool lab and depend on installed tools, host permissions, and explicit target allowlists.',
  },
];

/** Claims the project can stand behind, each backed by linkable proof. */
export const CLAIMS_MADE: string[] = [
  'A hardened gateway with JWT/RBAC, refresh-token rotation, and reuse detection, covered by tests.',
  'Allowlist-enforced, defensive scanner and assessment orchestration with subprocess timeouts.',
  'A working tshark-to-flows-to-anomaly telemetry path with seeded cloud-demo telemetry.',
  'An Azure cloud-demo architecture in Terraform where only the gateway has external ingress.',
  'CI that builds, tests, validates Compose and Terraform, and runs secret/dependency scans.',
];

/** Claims the project explicitly does NOT make. */
export const CLAIMS_NOT_MADE: string[] = [
  'It is not production-ready and not an enterprise-grade product.',
  'It is not a production SOC and not a real-time SOC.',
  'It is not compliance-certified (not SOC 2 compliant, not ISO 27001 certified).',
  'It is not an exploitation framework and performs no autonomous exploitation.',
  'It is not a scanner for arbitrary public targets.',
];
