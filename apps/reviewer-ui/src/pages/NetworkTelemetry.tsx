import { Activity, Radar, Waypoints } from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ProofCard } from '../components/shared/ProofCard';
import { ProofLink } from '../components/shared/ProofLink';
import { LimitationCallout } from '../components/shared/LimitationCallout';
import { TrafficSparkline } from '../components/features/TrafficSparkline';
import {
  ANOMALY_LOGIC,
  CAPTURE_CAVEATS,
  FLOW_MODEL,
  TELEMETRY_EVIDENCE,
  TELEMETRY_MISSION,
  TELEMETRY_MODES,
} from '../data/networkTelemetry';

export function NetworkTelemetry() {
  return (
    <div className="page-stack">
      <section className="surface-section">
        <SectionHeader
          eyebrow="Network telemetry"
          title="Packets to flows to an explainable anomaly"
          icon={<Radar size={18} />}
        />
        <p className="prose">{TELEMETRY_MISSION}</p>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Telemetry modes" title="Where the data comes from" icon={<Waypoints size={18} />} />
        <div className="grid grid--3">
          {TELEMETRY_MODES.map((mode) => (
            <ProofCard
              key={mode.title}
              title={mode.title}
              badge={
                <Badge tone={mode.tone} uppercase>
                  {mode.tone === 'amber' ? 'local' : mode.tone === 'violet' ? 'demo' : 'scope'}
                </Badge>
              }
              proofs={[mode.proof]}
            >
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
          title="Traffic pattern with an injectable spike"
          description="The detection is a single, readable rule, shown as a moving flow pattern rather than a frozen table."
          icon={<Radar size={18} />}
        />
        <TrafficSparkline />
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
