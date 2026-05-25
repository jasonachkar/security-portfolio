import type { ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'teal'
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'slate'
  | 'green'
  | 'rose';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Small caps styling for status chips. */
  uppercase?: boolean;
}

export function Badge({ children, tone = 'neutral', icon, uppercase = false }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}${uppercase ? ' badge--caps' : ''}`}>
      {icon ? <span className="badge__icon">{icon}</span> : null}
      {children}
    </span>
  );
}
