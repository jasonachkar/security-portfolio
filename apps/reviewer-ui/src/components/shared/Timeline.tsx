import { ProofLink, type Proof } from './ProofLink';

export interface TimelineStep {
  title: string;
  detail: string;
  proof?: Proof;
}

interface TimelineProps {
  steps: TimelineStep[];
  /** "horizontal" wraps into a flowing strip; "vertical" stacks with a rail. */
  variant?: 'vertical' | 'horizontal';
}

export function Timeline({ steps, variant = 'vertical' }: TimelineProps) {
  return (
    <ol className={`timeline timeline--${variant}`}>
      {steps.map((step, index) => (
        <li className="timeline-step" key={step.title}>
          <div className="timeline-step__marker">
            <span className="timeline-step__index">{index + 1}</span>
          </div>
          <div className="timeline-step__body">
            <h3 className="timeline-step__title">{step.title}</h3>
            <p className="timeline-step__detail">{step.detail}</p>
            {step.proof ? <ProofLink proof={step.proof} compact /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
