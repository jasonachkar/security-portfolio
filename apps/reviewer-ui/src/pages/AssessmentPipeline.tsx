import { Boxes, Crosshair, FileSearch, ShieldCheck, Workflow } from 'lucide-react';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ProofCard } from '../components/shared/ProofCard';
import { Timeline } from '../components/shared/Timeline';
import { ProofLink } from '../components/shared/ProofLink';
import { LimitationCallout } from '../components/shared/LimitationCallout';
import {
  ASSESSMENT_LIFECYCLE,
  ORCHESTRATOR_STORY,
  PIPELINE_EVIDENCE,
  PIPELINE_GUARDRAILS,
  PIPELINE_MISSION,
  SCANNER_STORY,
} from '../data/assessmentPipeline';

export function AssessmentPipeline() {
  return (
    <div className="page-stack">
      <section className="surface-section">
        <SectionHeader eyebrow="Defensive assessment" title="A safe lifecycle, end to end" icon={<Workflow size={18} />} />
        <p className="prose">{PIPELINE_MISSION}</p>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Lifecycle"
          title="Request → allowlist → queue → run → persist → review"
          description="The allowlist check happens before any tool starts — nothing runs against a target that is not explicitly permitted."
          icon={<Boxes size={18} />}
        />
        <Timeline steps={ASSESSMENT_LIFECYCLE} variant="horizontal" />
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Scanner story"
          title="ZAP web scanning"
          description="Create a scan, run it in the background, map alerts to findings — or import deterministic demo findings."
          icon={<FileSearch size={18} />}
        />
        <div className="grid grid--2">
          {SCANNER_STORY.map((point) => (
            <ProofCard key={point.title} title={point.title} proofs={[point.proof]}>
              <p>{point.detail}</p>
            </ProofCard>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Orchestrator story"
          title="Nmap, ZAP, optional Trivy"
          description="Safe subprocess construction and timeouts, with results captured as typed artifacts."
          icon={<Crosshair size={18} />}
        />
        <div className="grid grid--2">
          {ORCHESTRATOR_STORY.map((point) => (
            <ProofCard key={point.title} title={point.title} proofs={[point.proof]}>
              <p>{point.detail}</p>
            </ProofCard>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Guardrails"
          title="Why this is defensive, not offensive"
          description="The safety model is explicit and enforced in code."
          icon={<ShieldCheck size={18} />}
        />
        <div className="grid grid--2">
          {PIPELINE_GUARDRAILS.map((guardrail) => (
            <div className="guardrail-card" key={guardrail.title}>
              <div className="guardrail-card__head">
                <ShieldCheck size={16} aria-hidden />
                <h3>{guardrail.title}</h3>
              </div>
              <p>{guardrail.detail}</p>
              <ProofLink proof={guardrail.proof} compact />
            </div>
          ))}
        </div>
        <LimitationCallout title="No exploitation, no arbitrary targets.">
          Tools perform discovery and defensive scanning only, against an allowlist of local/demo targets. Requests
          outside that boundary are rejected before any tool runs.
        </LimitationCallout>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Evidence" title="Trace the pipeline in code" icon={<FileSearch size={18} />} />
        <div className="proof-row">
          {PIPELINE_EVIDENCE.map((proof) => (
            <ProofLink key={`${proof.kind}:${proof.path}`} proof={proof} />
          ))}
        </div>
      </section>
    </div>
  );
}
