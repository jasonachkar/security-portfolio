import { ExternalLink } from 'lucide-react';
import type { BadgeTone } from './Badge';

/** Categories of proof a reviewer can click through to. */
export type ProofKind = 'code' | 'test' | 'workflow' | 'doc' | 'evidence' | 'screenshot';

/**
 * GitHub blob base for the lab branch. Every repo-relative path a page cites
 * (source, test, workflow, doc, evidence sample, or screenshot) resolves here,
 * so reviewers click straight from a claim to the file that proves it.
 */
export const GITHUB_BASE_URL =
  'https://github.com/jasonachkar/security-portfolio/blob/refactor/defensive-security-platform-lab/';

export interface Proof {
  kind: ProofKind;
  /** Repository-relative path, e.g. "apps/gateway/src/auth.ts". */
  path: string;
  /** Optional display label; defaults to the path. */
  label?: string;
}

const KIND_META: Record<ProofKind, { label: string; tone: BadgeTone }> = {
  code: { label: 'code', tone: 'indigo' },
  test: { label: 'test', tone: 'green' },
  workflow: { label: 'ci', tone: 'violet' },
  doc: { label: 'doc', tone: 'slate' },
  evidence: { label: 'evidence', tone: 'amber' },
  screenshot: { label: 'shot', tone: 'teal' },
};

/** Resolve a repo-relative path to its GitHub blob URL on the lab branch. */
export function proofHref(path: string): string {
  return `${GITHUB_BASE_URL}${path.replace(/^\/+/, '')}`;
}

interface ProofLinkProps {
  proof: Proof;
  /** Compact variant for dense inline rows. */
  compact?: boolean;
}

export function ProofLink({ proof, compact = false }: ProofLinkProps) {
  const meta = KIND_META[proof.kind];
  return (
    <a
      className={`proof-link${compact ? ' proof-link--compact' : ''}`}
      href={proofHref(proof.path)}
      target="_blank"
      rel="noreferrer"
      title={`Open ${proof.path} on GitHub (${proof.kind})`}
    >
      <span className={`badge badge--${meta.tone} badge--caps proof-link__kind`}>{meta.label}</span>
      <span className="proof-link__path">{proof.label ?? proof.path}</span>
      <ExternalLink className="proof-link__icon" size={13} aria-hidden />
    </a>
  );
}
