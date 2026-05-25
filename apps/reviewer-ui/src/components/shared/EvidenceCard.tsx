import { ProofLink } from './ProofLink';
import { Badge } from './Badge';
import type { EvidenceItem } from '../../data/evidenceCatalog';
import { EVIDENCE_STATUS_TONE } from '../../data/evidenceCatalog';

export function EvidenceCard({ item }: { item: EvidenceItem }) {
  return (
    <article className="evidence-card">
      <div className="evidence-card__head">
        <h3 className="evidence-card__title">{item.title}</h3>
        <Badge tone={EVIDENCE_STATUS_TONE[item.status]} uppercase>
          {item.status}
        </Badge>
      </div>
      <p className="evidence-card__proves">
        <span className="evidence-card__label">Proves</span> {item.proves}
      </p>
      <ProofLink proof={item.proof} compact />
      <p className="evidence-card__limitation">
        <span className="evidence-card__label">Limitation</span> {item.limitation}
      </p>
    </article>
  );
}
