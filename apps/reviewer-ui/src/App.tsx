import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudCog,
  Database,
  ExternalLink,
  GitBranch,
  LockKeyhole,
  ServerCog,
  Shield,
} from 'lucide-react';
import {
  activeServices,
  anomalies,
  controls,
  evidenceItems,
  navItems,
  PageId,
  radarIcon,
  realDemoPlanned,
} from './data';

const pageTitles: Record<PageId, string> = {
  start: 'Defensive Security Platform Lab',
  architecture: 'Architecture',
  gateway: 'Secure Gateway',
  pipeline: 'Assessment Pipeline',
  network: 'Network Telemetry',
  azure: 'Azure Deployment',
  evidence: 'Evidence',
  sandbox: 'Lab Sandbox',
};

function ClaimLink({ path }: { path: string }) {
  return (
    <span className="claim-link">
      <ExternalLink size={14} /> {path}
    </span>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatusTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Capability Boundary</th>
          </tr>
        </thead>
        <tbody>
          {realDemoPlanned.map(([status, detail]) => (
            <tr key={status}>
              <td>{status}</td>
              <td>{detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StartHere({ go }: { go: (page: PageId) => void }) {
  return (
    <>
      <div className="intro-grid">
        <div className="intro-copy">
          <p className="eyebrow">portfolio-grade / production-inspired / defensive lab</p>
          <h1>Defensive Security Platform Lab</h1>
          <p>
            A controlled internal security platform concept showing gateway hardening, scanner
            orchestration, network telemetry, local full-tool execution, Azure cloud-demo design,
            and evidence-backed automation.
          </p>
          <div className="button-row">
            <button onClick={() => go('architecture')}>
              Architecture <ArrowRight size={16} />
            </button>
            <button className="secondary" onClick={() => go('evidence')}>
              Evidence <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
        <div className="signal-panel" aria-label="Architecture preview">
          <div className="node public">Gateway</div>
          <div className="link-line" />
          <div className="node-row">
            <div className="node">Scanner</div>
            <div className="node">Network</div>
            <div className="node">Assessments</div>
          </div>
          <div className="node-row low">
            <div className="node muted">PostgreSQL</div>
            <div className="node muted">Redis/Celery</div>
            <div className="node muted">ZAP local</div>
          </div>
        </div>
      </div>

      <Section title="5-Minute Reviewer Path" icon={<Shield size={18} />}>
        <div className="path-grid">
          {['Architecture', 'Secure Gateway', 'Assessment Pipeline', 'Network Telemetry', 'Evidence'].map(
            (item, index) => (
              <button
                key={item}
                className="path-step"
                onClick={() => go(['architecture', 'gateway', 'pipeline', 'network', 'evidence'][index] as PageId)}
              >
                <span>{index + 1}</span>
                {item}
              </button>
            )
          )}
        </div>
      </Section>

      <Section title="Active Services">
        <div className="service-grid">
          {activeServices.map(([name, detail]) => (
            <article className="tile" key={name}>
              <h3>{name}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Real vs Demo vs Planned">
        <StatusTable />
      </Section>
    </>
  );
}

function Architecture() {
  return (
    <>
      <Section title="Cloud-Demo Trust Boundaries" icon={<CloudCog size={18} />}>
        <div className="architecture-band">
          <div className="boundary public-boundary">
            <h3>Public</h3>
            <p>Azure Static Web Apps reviewer UI and Container Apps gateway ingress.</p>
          </div>
          <div className="boundary private-boundary">
            <h3>Internal</h3>
            <p>Scanner, network analyzer, assessment orchestrator, PostgreSQL, Redis, logs.</p>
          </div>
          <div className="boundary local-boundary">
            <h3>Local Tooling</h3>
            <p>ZAP, Nmap, Trivy, and tshark real execution stay local-lab by default.</p>
          </div>
        </div>
      </Section>
      <Section title="Local Full-Tool Lab">
        <div className="diagram">
          <span>Reviewer UI</span>
          <ArrowRight size={18} />
          <span>Gateway</span>
          <ArrowRight size={18} />
          <span>Internal APIs</span>
          <ArrowRight size={18} />
          <span>PostgreSQL / Redis / ZAP</span>
        </div>
        <p className="muted-copy">
          Local mode supports active ZAP/Nmap/tshark execution only for allowlisted local/demo
          targets. <ClaimLink path="infra/local/docker-compose.yml" />
        </p>
      </Section>
    </>
  );
}

function Gateway() {
  return (
    <>
      <Section title="Gateway Security Controls" icon={<LockKeyhole size={18} />}>
        <div className="control-list">
          {controls.map(([name, path]) => (
            <div className="control" key={name}>
              <CheckCircle2 size={17} />
              <div>
                <strong>{name}</strong>
                <ClaimLink path={path} />
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="OWASP API Top 10 Mapping">
        <div className="mapping-grid">
          <span>Broken auth</span>
          <strong>JWT expiry, refresh rotation, reuse detection</strong>
          <span>Broken authorization</span>
          <strong>Role permissions and denial audit events</strong>
          <span>SSRF</span>
          <strong>Fixed service registry and upstream allowlist</strong>
          <span>Unrestricted resource use</span>
          <strong>Rate limits and request size limits</strong>
        </div>
      </Section>
    </>
  );
}

function Pipeline() {
  return (
    <>
      <Section title="Assessment Lifecycle" icon={<ServerCog size={18} />}>
        <div className="lifecycle">
          {['Request', 'Allowlist', 'Queue', 'Run tools', 'Persist artifacts', 'Review evidence'].map((item) => (
            <div className="lifecycle-step" key={item}>{item}</div>
          ))}
        </div>
      </Section>
      <Section title="Tool Boundaries">
        <div className="service-grid">
          <article className="tile">
            <h3>ZAP Scanner</h3>
            <p>Local/demo web scanning with findings persisted to PostgreSQL.</p>
            <ClaimLink path="apps/vulnerability-scanner" />
          </article>
          <article className="tile">
            <h3>Nmap/ZAP/Trivy Orchestrator</h3>
            <p>Defensive service discovery and artifact capture with strict target validation.</p>
            <ClaimLink path="apps/assessment-orchestrator" />
          </article>
          <article className="tile">
            <h3>Cloud-Demo Import</h3>
            <p>Seeded assessment story for Azure review without active internet scanning.</p>
            <ClaimLink path="apps/assessment-orchestrator/tests/test_assessments.py" />
          </article>
        </div>
      </Section>
    </>
  );
}

function NetworkTelemetry() {
  const Radar = radarIcon;
  return (
    <>
      <Section title="Telemetry Modes" icon={<Radar size={18} />}>
        <div className="service-grid">
          <article className="tile">
            <h3>Local Capture</h3>
            <p>tshark parses local packets into flows. Capture requires local permissions.</p>
          </article>
          <article className="tile">
            <h3>Cloud-Demo</h3>
            <p>Seeded flow and anomaly data is labelled as demo telemetry.</p>
          </article>
          <article className="tile">
            <h3>Detection</h3>
            <p>Simple traffic spike logic demonstrates the telemetry-to-evidence path.</p>
          </article>
        </div>
      </Section>
      <Section title="Seeded Anomalies">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Target</th>
                <th>Severity</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((item) => (
                <tr key={item.source + item.target}>
                  <td>{item.source}</td>
                  <td>{item.target}</td>
                  <td>{item.severity}</td>
                  <td>{item.bytes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function AzureDeployment() {
  return (
    <>
      <Section title="Azure Cloud-Demo Components" icon={<Database size={18} />}>
        <div className="service-grid">
          {[
            'Azure Static Web Apps',
            'Azure Container Apps',
            'Azure Container Registry',
            'Log Analytics',
            'Managed identity',
            'GitHub Actions OIDC',
          ].map((item) => (
            <article className="tile compact" key={item}>
              <h3>{item}</h3>
            </article>
          ))}
        </div>
      </Section>
      <Section title="Safety Notes">
        <div className="notice">
          <AlertTriangle size={18} />
          <p>
            Only the gateway has external ingress. Internal services default to demo/sample mode in
            Azure unless explicitly configured with allowlisted targets.
          </p>
        </div>
        <ClaimLink path="docs/security/cloud-demo-safety-model.md" />
      </Section>
    </>
  );
}

function Evidence() {
  return (
    <>
      <Section title="Evidence Inventory" icon={<GitBranch size={18} />}>
        <div className="evidence-grid">
          {evidenceItems.map(([name, path]) => (
            <article className="evidence-item" key={name}>
              <h3>{name}</h3>
              <ClaimLink path={path} />
            </article>
          ))}
        </div>
      </Section>
      <Section title="Generated vs Manual Evidence">
        <StatusTable />
        <p className="muted-copy">
          Azure portal screenshots are placeholders until captured from a real deployment and
          reviewed for secrets.
        </p>
      </Section>
    </>
  );
}

function Sandbox() {
  return (
    <Section title="Secondary Demo Surface">
      <div className="notice">
        <AlertTriangle size={18} />
        <p>
          The sandbox is intentionally secondary. Reviewers should use the Start Here path first;
          live API calls depend on local lab services or a configured cloud-demo API base URL.
        </p>
      </div>
      <div className="api-base">API base: {import.meta.env.VITE_API_BASE_URL ?? 'demo data only'}</div>
    </Section>
  );
}

export function App() {
  const [active, setActive] = useState<PageId>('start');
  const ActivePage = useMemo(() => {
    switch (active) {
      case 'architecture':
        return <Architecture />;
      case 'gateway':
        return <Gateway />;
      case 'pipeline':
        return <Pipeline />;
      case 'network':
        return <NetworkTelemetry />;
      case 'azure':
        return <AzureDeployment />;
      case 'evidence':
        return <Evidence />;
      case 'sandbox':
        return <Sandbox />;
      default:
        return <StartHere go={setActive} />;
    }
  }, [active]);

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <Shield size={22} />
          <div>
            <strong>DSP Lab</strong>
            <span>defensive platform</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={active === item.id ? 'active' : ''}
                onClick={() => setActive(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">safe defensive scanning / allowlisted targets only</p>
            <h1>{pageTitles[active]}</h1>
          </div>
          <span className="mode-pill">cloud-demo safe</span>
        </header>
        {ActivePage}
      </main>
    </div>
  );
}
