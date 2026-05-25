import { Activity, Radar, Waypoints } from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ProofCard } from '../components/shared/ProofCard';
import { ProofLink } from '../components/shared/ProofLink';
import { LimitationCallout } from '../components/shared/LimitationCallout';
import {
  ANOMALY_EXAMPLE,
  ANOMALY_LOGIC,
  BASELINE_FLOW,
  CAPTURE_CAVEATS,
  FLOW_MODEL,
  TELEMETRY_EVIDENCE,
  TELEMETRY_MISSION,
  TELEMETRY_MODES,
  type AnomalyExample,
} from '../data/networkTelemetry';

function FlowCard({ flow, tone }: { flow: AnomalyExample; tone: 'amber' | 'green' }) {
  const isSpike = flow.kind === 'traffic_spike';
  return (
    <div className={`flow-card flow-card--${tone}`}>
      <div className="flow-card__head">
        <span className="flow-card__route">
          {flow.source} <span aria-hidden>→</span> {flow.destination}:{flow.port}
        </span>
        <Badge tone={isSpike ? 'rose' : 'slate'} uppercase>
          {flow.severity}
        </Badge>
      </div>
      <div className="flow-card__metrics">
        <span>
          <strong>{flow.bytes}</strong> bytes
        </span>
        <span>
          <strong>{flow.packets}</strong> packets
        </span>
        <span>
          <strong>tcp</strong> /{flow.port}
        </span>
      </div>
      <span className="flow-card__kind">{isSpike ? 'crossed the spike threshold' : 'within normal baseline'}</span>
    </div>
  );
}

export function NetworkTelemetry() {
  return (
    <div className="page-stack">
      <section className="surface-section">
        <SectionHeader eyebrow="Network telemetry" title="Packets → flows → an explainable anomaly" icon={<Radar size={18} />} />
        <p className="prose">{TELEMETRY_MISSION}</p>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Telemetry modes" title="Where the data comes from" icon={<Waypoints size={18} />} />
        <div className="grid grid--3">
          {TELEMETRY_MODES.map((mode) => (
            <ProofCard key={mode.title} title={mode.title} badge={<Badge tone={mode.tone} uppercase>{mode.tone === 'amber' ? 'local' : mode.tone === 'violet' ? 'demo' : 'scope'}</Badge>} proofs={[mode.proof]}>
              <p>{mode.detail}</p>
            </ProofCard>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Flow model"
          title="What a flow record holds"
          description="tshark packets are aggregated into flows keyed by source, destination, protocol, and port."
          icon={<Activity size={18} />}
        />
        <div className="flow-model">
          {FLOW_MODEL.map((field) => (
            <div className="flow-model__field" key={field.field}>
              <span className="flow-model__name">{field.field}</span>
              <span className="flow-model__example">{field.example}</span>
              <span className="flow-model__note">{field.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Anomaly example"
          title="A traffic spike, side by side with a baseline"
          description="The detection is a single, readable rule — easy to explain in an interview."
          icon={<Radar size={18} />}
        />
        <div className="anomaly-compare">
          <FlowCard flow={BASELINE_FLOW} tone="green" />
          <FlowCard flow={ANOMALY_EXAMPLE} tone="amber" />
        </div>
        <div className="rule-grid">
          <div>
            <span className="rule-grid__label">Rule</span>
            <span className="rule-grid__value">{ANOMALY_LOGIC.rule}</span>
          </div>
          <div>
            <span className="rule-grid__label">Threshold</span>
            <span className="rule-grid__value">{ANOMALY_LOGIC.threshold}</span>
          </div>
          <div>
            <span className="rule-grid__label">Severity</span>
            <span className="rule-grid__value">{ANOMALY_LOGIC.severity}</span>
          </div>
          <div>
            <span className="rule-grid__label">Evidence</span>
            <span className="rule-grid__value">{ANOMALY_LOGIC.evidence}</span>
          </div>
        </div>
        <div className="proof-row">
          <ProofLink proof={ANOMALY_LOGIC.proof} />
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Capture caveats" title="Honest about local capture" icon={<Activity size={18} />} />
        <LimitationCallout title="Packet capture is local-only and permission-gated.">
          <ul className="checklist">
            {CAPTURE_CAVEATS.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </LimitationCallout>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Evidence" title="Trace the telemetry in code" icon={<Radar size={18} />} />
        <div className="proof-row">
          {TELEMETRY_EVIDENCE.map((proof) => (
            <ProofLink key={`${proof.kind}:${proof.path}`} proof={proof} />
          ))}
        </div>
      </section>
    </div>
  );
}
