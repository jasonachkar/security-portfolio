import { KeyRound, ListChecks, LockKeyhole, ShieldCheck, Wrench } from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ProofCard } from '../components/shared/ProofCard';
import { StatusTable } from '../components/shared/StatusTable';
import { MetricCard } from '../components/shared/MetricCard';
import { ProofLink } from '../components/shared/ProofLink';
import { LimitationCallout } from '../components/shared/LimitationCallout';
import { AuthFlowVisualizer } from '../components/features/AuthFlowVisualizer';
import { RateLimiterSim } from '../components/features/RateLimiterSim';
import {
  GATEWAY_MISSION,
  GATEWAY_TRADEOFFS,
  OWASP_API_TOP10,
  SECURITY_CONTROLS,
} from '../data/gatewayControls';
import { GITHUB_STATS } from '../data/generated/githubStats';

export function SecureGateway() {
  return (
    <div className="page-stack">
      <section className="surface-section">
        <SectionHeader eyebrow="Gateway mission" title="One enforcement point for the whole platform" icon={<ShieldCheck size={18} />} />
        <p className="prose">{GATEWAY_MISSION}</p>
        <div className="metric-grid metric-grid--row">
          <MetricCard value={GITHUB_STATS.testCounts.gateway} label="Gateway tests" hint="Counted at build time" tone="green" />
          <MetricCard value={`${GITHUB_STATS.gateway.accessTokenTtlMinutes} min`} label="Access token TTL" hint="Short-lived JWT" tone="teal" />
          <MetricCard value="1-use" label="Refresh tokens" hint="Rotated, reuse-detected" tone="indigo" />
          <MetricCard value={GITHUB_STATS.gateway.roleCount} label="Roles" hint="admin / analyst / auditor" tone="violet" />
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Authentication flow"
          title="Login, rotation, reuse detection, logout"
          description="A rotating refresh-token family. Replaying a spent token revokes the family and logs an audit event."
          icon={<KeyRound size={18} />}
        />
        <AuthFlowVisualizer />
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Rate limiting"
          title="Click through the 429 path"
          description="The simulator displays the actual gateway policy and compresses the request count so the rejection path is visible in seconds."
          icon={<LockKeyhole size={18} />}
        />
        <RateLimiterSim />
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Security controls"
          title="Every control links to its code"
          description="These are implemented in the Fastify gateway, not aspirational."
          icon={<LockKeyhole size={18} />}
        />
        <div className="grid grid--2">
          {SECURITY_CONTROLS.map((control) => (
            <ProofCard key={control.name} title={control.name} proofs={control.proofs}>
              <p>{control.detail}</p>
            </ProofCard>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="OWASP API Security Top 10 (2023)"
          title="Mapped to concrete mitigations"
          description="The risks this gateway is built to address, each tied to code or a test."
          icon={<ListChecks size={18} />}
        />
        <StatusTable
          head={['ID', 'Risk', 'How the gateway addresses it', 'Proof']}
          minWidth={760}
          rows={OWASP_API_TOP10.map((row) => [
            <Badge tone="rose" uppercase>
              {row.id}
            </Badge>,
            <span className="cell-strong">{row.risk}</span>,
            row.mitigation,
            <ProofLink proof={row.proof} compact />,
          ])}
        />
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Tests & evidence" title="What backs these claims" icon={<ShieldCheck size={18} />} />
        <p className="prose">
          The gateway has {GITHUB_STATS.testCounts.gateway} tests covering login, refresh rotation, reuse detection with family
          revocation, RBAC denial, request validation, rate limiting, the SSRF upstream check, and audit emission.
        </p>
        <div className="proof-row">
          <ProofLink proof={{ kind: 'test', path: 'apps/gateway/test/gateway.test.ts' }} />
          <ProofLink proof={{ kind: 'doc', path: 'docs/security/api-gateway-security.md' }} />
          <ProofLink proof={{ kind: 'workflow', path: '.github/workflows/ci.yml' }} />
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Tradeoffs" title="What production hardening would add next" icon={<Wrench size={18} />} />
        <LimitationCallout tone="info" title="This is a lab gateway, not hardened multi-instance infrastructure.">
          <ul className="checklist">
            {GATEWAY_TRADEOFFS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </LimitationCallout>
      </section>
    </div>
  );
}
