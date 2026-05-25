import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface LimitationCalloutProps {
  title?: string;
  children: ReactNode;
  tone?: 'warn' | 'info';
}

export function LimitationCallout({ title, children, tone = 'warn' }: LimitationCalloutProps) {
  return (
    <div className={`limitation-callout limitation-callout--${tone}`} role="note">
      <span className="limitation-callout__icon" aria-hidden>
        <ShieldAlert size={18} />
      </span>
      <div className="limitation-callout__body">
        {title ? <p className="limitation-callout__title">{title}</p> : null}
        <div className="limitation-callout__text">{children}</div>
      </div>
    </div>
  );
}
