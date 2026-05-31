import type { ReactNode } from 'react';
import type { BadgeTone } from './Badge';

interface MetricCardProps {
  value: ReactNode;
  label: string;
  hint?: string;
  icon?: ReactNode;
  tone?: BadgeTone;
}

export function MetricCard({ value, label, hint, icon, tone = 'teal' }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span className="metric-card__value">{value}</span>
        {icon ? <span className="metric-card__icon">{icon}</span> : null}
      </div>
      <span className="metric-card__label">{label}</span>
      {hint ? <span className="metric-card__hint">{hint}</span> : null}
    </div>
  );
}
