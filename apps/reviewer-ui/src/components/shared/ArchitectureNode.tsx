import { ProofLink, type Proof } from './ProofLink';
import type { BadgeTone } from './Badge';

interface ArchitectureNodeProps {
  name: string;
  role: string;
  detail: string;
  tone: BadgeTone;
  proof?: Proof;
}

export function ArchitectureNode({ name, role, detail, tone, proof }: ArchitectureNodeProps) {
  return (
    <div className={`arch-node arch-node--${tone}`}>
      <div className="arch-node__head">
        <span className="arch-node__name">{name}</span>
        <span className="arch-node__role">{role}</span>
      </div>
      <p className="arch-node__detail">{detail}</p>
      {proof ? <ProofLink proof={proof} compact /> : null}
    </div>
  );
}
