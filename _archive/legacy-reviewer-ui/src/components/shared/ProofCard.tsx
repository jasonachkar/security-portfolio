import type { ReactNode } from 'react';
import { ProofLink, type Proof } from './ProofLink';

interface ProofCardProps {
  title: string;
  children?: ReactNode;
  proofs?: Proof[];
  badge?: ReactNode;
  icon?: ReactNode;
  /** Optional eyebrow/role line above the title. */
  eyebrow?: string;
}

export function ProofCard({ title, children, proofs, badge, icon, eyebrow }: ProofCardProps) {
  return (
    <article className="proof-card">
      <div className="proof-card__head">
        {icon ? <span className="proof-card__icon">{icon}</span> : null}
        <div className="proof-card__heading">
          {eyebrow ? <span className="proof-card__eyebrow">{eyebrow}</span> : null}
          <h3 className="proof-card__title">{title}</h3>
        </div>
        {badge ? <span className="proof-card__badge">{badge}</span> : null}
      </div>
      {children ? <div className="proof-card__body">{children}</div> : null}
      {proofs && proofs.length > 0 ? (
        <div className="proof-card__foot">
          {proofs.map((proof) => (
            <ProofLink key={`${proof.kind}:${proof.path}:${proof.label ?? ''}`} proof={proof} compact />
          ))}
        </div>
      ) : null}
    </article>
  );
}
