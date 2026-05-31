import { Link } from 'react-router-dom';
import { FlaskConical, Server, TerminalSquare } from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ProofLink } from '../components/shared/ProofLink';
import { LimitationCallout } from '../components/shared/LimitationCallout';

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'demo data only (no API base configured)';

const LOCAL_ENDPOINTS: { method: string; path: string; note: string }[] = [
  { method: 'GET', path: '/healthz', note: 'Gateway liveness (no auth).' },
  { method: 'POST', path: '/auth/login', note: 'Local demo users → access + refresh.' },
  { method: 'GET', path: '/api/scans', note: 'Proxied to the scanner (scans:read).' },
  { method: 'POST', path: '/api/scans/demo/import', note: 'Seed deterministic demo findings.' },
  { method: 'GET', path: '/api/network/stats', note: 'Proxied to the network analyzer.' },
  { method: 'GET', path: '/api/assessments', note: 'Proxied to the orchestrator.' },
  { method: 'GET', path: '/admin/audit-events', note: 'Auditor/admin only (audit:read).' },
];

const CLOUD_ENDPOINTS: { label: string; value: string }[] = [
  { label: 'Reviewer UI (Static Web Apps)', value: 'https://<swa-name>.azurestaticapps.net — placeholder' },
  { label: 'Gateway (Container Apps)', value: 'https://ca-...-gateway.<region>.azurecontainerapps.io — placeholder' },
  { label: 'Internal services', value: 'internal ingress only — not publicly reachable' },
];

export function LabSandbox() {
  return (
    <div className="page-stack">
      <section className="surface-section surface-section--muted">
        <SectionHeader
          eyebrow="Optional"
          title="A secondary surface for hands-on exploration"
          description={
            <>
              This page is intentionally optional. Start with the{' '}
              <Link to="/">Start Here</Link> reviewer path — the sandbox only matters if you want to poke at the API.
            </>
          }
          icon={<FlaskConical size={18} />}
        />
        <div className="api-base-line">
          <Badge tone="slate" uppercase>
            API base
          </Badge>
          <code>{apiBase}</code>
        </div>
        <LimitationCallout title="Demo mode by default.">
          With no API base configured the UI shows demo data only. Live calls require either the local lab
          (docker compose) or a configured cloud-demo gateway URL. There is no live, unsafe scanning here.
        </LimitationCallout>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Local lab" title="Endpoints through the gateway" icon={<Server size={18} />} />
        <div className="endpoint-list">
          {LOCAL_ENDPOINTS.map((endpoint) => (
            <div className="endpoint" key={`${endpoint.method} ${endpoint.path}`}>
              <Badge tone={endpoint.method === 'GET' ? 'teal' : 'indigo'} uppercase>
                {endpoint.method}
              </Badge>
              <code className="endpoint__path">{endpoint.path}</code>
              <span className="endpoint__note">{endpoint.note}</span>
            </div>
          ))}
        </div>
        <div className="proof-row">
          <ProofLink proof={{ kind: 'code', path: 'apps/gateway/src/config.ts', label: 'config.ts · service registry' }} />
          <ProofLink proof={{ kind: 'evidence', path: 'evidence/api/gateway-health.example.json' }} />
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Sample requests" title="Log in, then call a service" icon={<TerminalSquare size={18} />} />
        <pre className="code-block">
          <code>{`# 1) Log in as a local demo user (local lab)
curl -s -X POST "$API/auth/login" \\
  -H 'content-type: application/json' \\
  -d '{"username":"analyst","password":"Analyst123!"}'

# 2) Seed deterministic demo findings (no live scan)
curl -s -X POST "$API/api/scans/demo/import" \\
  -H "authorization: Bearer $ACCESS_TOKEN"

# 3) List scans
curl -s "$API/api/scans" -H "authorization: Bearer $ACCESS_TOKEN"`}</code>
        </pre>
        <p className="muted">Local demo credentials are documented in the README and are local-only examples.</p>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Cloud-demo" title="Endpoint placeholders" icon={<Server size={18} />} />
        <div className="endpoint-list">
          {CLOUD_ENDPOINTS.map((endpoint) => (
            <div className="endpoint endpoint--stacked" key={endpoint.label}>
              <span className="endpoint__label">{endpoint.label}</span>
              <code className="endpoint__path">{endpoint.value}</code>
            </div>
          ))}
        </div>
        <LimitationCallout tone="info" title="No live unsafe scanning.">
          Cloud-demo services run with seeded data and disabled tools. The URLs above are placeholders until a real
          cloud-demo deploy is published.
        </LimitationCallout>
      </section>
    </div>
  );
}
