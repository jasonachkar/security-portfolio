import { Cloud, GitBranch, Lock, ScrollText, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ProofCard } from '../components/shared/ProofCard';
import { ProofLink } from '../components/shared/ProofLink';
import { LimitationCallout } from '../components/shared/LimitationCallout';
import {
  AZURE_GOAL,
  AZURE_PLACEHOLDERS,
  AZURE_RESOURCES,
  AZURE_SECURITY,
  CICD_FLOW,
  STEP_STATUS_TONE,
} from '../data/azureDeployment';

export function AzureDeployment() {
  return (
    <div className="page-stack">
      <section className="surface-section">
        <SectionHeader eyebrow="Cloud-demo goal" title="Prove the architecture, not broad scanning" icon={<Cloud size={18} />} />
        <p className="prose">{AZURE_GOAL}</p>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Azure resources"
          title="What Terraform provisions"
          description="A reusable container-app module composes the gateway, internal services, and supporting resources."
          icon={<Cloud size={18} />}
        />
        <div className="grid grid--3">
          {AZURE_RESOURCES.map((resource) => (
            <ProofCard key={resource.name} title={resource.name} eyebrow={resource.role} proofs={[resource.proof]}>
              <p>{resource.detail}</p>
            </ProofCard>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Security architecture"
          title="Public gateway, private services, seeded data"
          description="The same trust model as the local lab, expressed in Terraform."
          icon={<Lock size={18} />}
        />
        <div className="grid grid--2">
          {AZURE_SECURITY.map((point) => (
            <div className="guardrail-card" key={point.title}>
              <div className="guardrail-card__head">
                <ShieldCheck size={16} aria-hidden />
                <h3>{point.title}</h3>
              </div>
              <p>{point.detail}</p>
              <ProofLink proof={point.proof} compact />
            </div>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="CI/CD"
          title="Build → scan → push → plan → deploy → smoke"
          description="Build, scan, and Terraform plan are automated; image push and apply are guarded manual steps until target image variables are set."
          icon={<GitBranch size={18} />}
        />
        <div className="cicd-flow">
          {CICD_FLOW.map((step, index) => (
            <div className="cicd-step" key={step.title}>
              <span className="cicd-step__index">{index + 1}</span>
              <div className="cicd-step__body">
                <div className="cicd-step__head">
                  <h3>{step.title}</h3>
                  <Badge tone={STEP_STATUS_TONE[step.status]} uppercase>
                    {step.status}
                  </Badge>
                </div>
                <p>{step.detail}</p>
                <ProofLink proof={step.proof} compact />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Evidence & placeholders" title="Azure evidence still to capture" icon={<ScrollText size={18} />} />
        <LimitationCallout title="This is not a live production deployment.">
          The Terraform validates and plans, but a real deploy and its portal screenshots are not captured here. The
          items below are placeholders to capture after a real cloud-demo deploy, redacted per the evidence guide.
        </LimitationCallout>
        <div className="grid grid--2">
          {AZURE_PLACEHOLDERS.map((item) => (
            <div className="placeholder-card" key={item.title}>
              <Badge tone="slate" uppercase>
                To capture
              </Badge>
              <span className="placeholder-card__title">{item.title}</span>
              <ProofLink proof={item.proof} compact />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
