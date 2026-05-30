/**
 * Shared honest-language constants. These boundaries avoid marketing claims
 * and keep the lab positioned as a controlled portfolio project.
 */

export interface Limitation {
  title: string;
  detail: string;
}

export const CORE_LIMITATIONS: Limitation[] = [
  {
    title: 'Not an operations-center program',
    detail:
      'This is a portfolio lab, not a staffed monitoring program. There is no on-call rotation, managed alerting pipeline, or 24/7 coverage.',
  },
  {
    title: 'Allowlisted local/demo targets only',
    detail:
      'Active scanning is restricted to an allowlist of local/demo targets and performs no offensive actions.',
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
  'It is a portfolio lab, not a managed operational service.',
  'It does not claim formal compliance certification.',
  'It does not provide offensive workflows or autonomous attack behavior.',
  'It only scans explicitly allowlisted local/demo targets.',
];
