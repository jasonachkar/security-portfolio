import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Cloud,
  Code2,
  FileCheck2,
  GitCommit,
  KeyRound,
  Network,
  Radar,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { CiBadge } from '../components/shared/CiBadge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ProofCard } from '../components/shared/ProofCard';
import { MetricCard } from '../components/shared/MetricCard';
import { StatusTable } from '../components/shared/StatusTable';
import { LimitationCallout } from '../components/shared/LimitationCallout';
import {
  CAPABILITY_MATRIX,
  HERO_BADGES,
  PROJECT_MISSION,
  PROJECT_NAME,
  PROOF_PILLARS,
  REVIEWER_PATH,
  STATUS_TONE,
} from '../data/projectFacts';
import { CORE_LIMITATIONS } from '../data/limitations';
import { GITHUB_STATS } from '../data/generated/githubStats';
import { RECENT_COMMITS } from '../data/generated/recentCommits';

const PILLAR_ICONS = [KeyRound, Workflow, Radar, Cloud];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not available';
}

export function StartHere() {
  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero__copy">
          <div className="badge-row">
            {HERO_BADGES.map((badge) => (
              <Badge key={badge.label} tone={badge.tone} uppercase>
                {badge.label}
              </Badge>
            ))}
            <CiBadge />
          </div>
          <h1 className="hero__title">{PROJECT_NAME}</h1>
          <p className="hero__mission">{PROJECT_MISSION}</p>
          <div className="hero__cta">
            <Link className="btn btn--primary" to="/architecture">
              View architecture <ArrowRight size={16} />
            </Link>
            <Link className="btn btn--ghost" to="/evidence">
              See the evidence <FileCheck2 size={16} />
            </Link>
          </div>
        </div>
        <aside className="hero__panel" aria-label="Platform at a glance">
          <span className="hero__panel-label">Platform at a glance</span>
          <div className="metric-grid">
            <MetricCard
              value={GITHUB_STATS.platform.publicIngressCount}
              label="Public ingress"
              hint="Terraform: gateway only"
              tone="teal"
              icon={<ShieldCheck size={16} />}
            />
            <MetricCard
              value={GITHUB_STATS.testCounts.total}
              label="Backend tests"
              hint="Counted from test files"
              tone="green"
            />
            <MetricCard
              value={GITHUB_STATS.languages.length}
              label="Languages"
              hint={GITHUB_STATS.languages.join(' / ') || 'Not available'}
              tone="indigo"
              icon={<Code2 size={16} />}
            />
            <MetricCard
              value={GITHUB_STATS.ciSuccessfulRuns}
              label="CI runs passed"
              hint={GITHUB_STATS.lastCiRunAt ? `Last: ${formatDate(GITHUB_STATS.lastCiRunAt)}` : 'No runs yet'}
              tone="violet"
            />
          </div>
        </aside>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="What this proves"
          title="Four areas of cloud-security engineering"
          description="Each pillar links to the implementing code so a reviewer can verify it directly."
          icon={<ShieldCheck size={18} />}
        />
        <div className="grid grid--2">
          {PROOF_PILLARS.map((pillar, index) => {
            const Icon = PILLAR_ICONS[index] ?? ShieldCheck;
            return (
              <ProofCard key={pillar.title} title={pillar.title} icon={<Icon size={18} />} proofs={[pillar.proof]}>
                <p>{pillar.blurb}</p>
              </ProofCard>
            );
          })}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="5-minute reviewer path"
          title="Read it in this order"
          description="The fastest route to understanding the platform and its safety model."
          icon={<ArrowRight size={18} />}
        />
        <div className="grid grid--4">
          {REVIEWER_PATH.map((step) => (
            <Link key={step.to} to={step.to} className="path-card">
              <span className="path-card__index">{step.index}</span>
              <span className="path-card__label">
                {step.label} <ArrowRight size={15} />
              </span>
              <span className="path-card__blurb">{step.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="GitHub activity"
          title="Recent commits fetched at build time"
          description={`Repository data source: ${GITHUB_STATS.dataSource}. Last push: ${formatDate(GITHUB_STATS.pushedAt)}.`}
          icon={<GitCommit size={18} />}
        />
        {RECENT_COMMITS.length > 0 ? (
          <div className="commit-feed">
            {RECENT_COMMITS.map((commit) => (
              <a key={commit.sha} className="commit-row" href={commit.url} target="_blank" rel="noreferrer">
                <code className="commit-sha">{commit.sha}</code>
                <span className="commit-message">{commit.message}</span>
                <span className="muted">{formatDate(commit.date)}</span>
                <ArrowRight size={14} aria-hidden />
              </a>
            ))}
          </div>
        ) : (
          <div className="link-card">
            <span className="link-card__title">No recent commits available from the current build context.</span>
            <span className="link-card__note">The GitHub Actions build refreshes this from the GitHub API.</span>
          </div>
        )}
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Architecture preview"
          title="One public door, internal everything else"
          description={
            <>
              The full picture lives on the <Link to="/architecture">Architecture</Link> page — here is the shape.
            </>
          }
          icon={<Network size={18} />}
        />
        <div className="arch-preview">
          <div className="arch-preview__band arch-preview__band--public">
            <span className="arch-preview__tag">Public</span>
            <div className="arch-preview__nodes">
              <span className="arch-preview__node">Reviewer UI</span>
              <span className="arch-preview__node arch-preview__node--accent">Secure Gateway</span>
            </div>
          </div>
          <div className="arch-preview__rail" aria-hidden>
            authenticated proxy ↓
          </div>
          <div className="arch-preview__band arch-preview__band--internal">
            <span className="arch-preview__tag">Internal</span>
            <div className="arch-preview__nodes">
              <span className="arch-preview__node">Scanner</span>
              <span className="arch-preview__node">Network analyzer</span>
              <span className="arch-preview__node">Assessment orchestrator</span>
              <span className="arch-preview__node arch-preview__node--muted">PostgreSQL</span>
              <span className="arch-preview__node arch-preview__node--muted">Redis / Celery</span>
            </div>
          </div>
          <div className="arch-preview__band arch-preview__band--tools">
            <span className="arch-preview__tag">Local-only tools</span>
            <div className="arch-preview__nodes">
              <span className="arch-preview__node">ZAP</span>
              <span className="arch-preview__node">Nmap</span>
              <span className="arch-preview__node">tshark</span>
              <span className="arch-preview__node arch-preview__node--muted">Trivy (off)</span>
            </div>
          </div>
          <p className="arch-preview__note">
            Azure cloud-demo boundary: the gateway Container App is external, every other service is internal, and
            scanner/network data is seeded sample data.
          </p>
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Honesty first"
          title="Real vs Demo vs Planned"
          description="What is implemented code, what is demo data, and what is explicitly out of scope."
          icon={<FileCheck2 size={18} />}
        />
        <StatusTable
          head={['Capability', 'Status', 'Notes']}
          minWidth={680}
          rows={CAPABILITY_MATRIX.map((row) => [
            <span className="cell-strong">{row.capability}</span>,
            <Badge tone={STATUS_TONE[row.status]} uppercase>
              {row.status}
            </Badge>,
            row.note,
          ])}
        />
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Limitations" title="What this lab is not" icon={<ShieldCheck size={18} />} />
        <div className="grid grid--2">
          {CORE_LIMITATIONS.map((limitation) => (
            <LimitationCallout key={limitation.title} title={limitation.title}>
              {limitation.detail}
            </LimitationCallout>
          ))}
        </div>
      </section>
    </div>
  );
}
