import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  icon?: ReactNode;
}

export function SectionHeader({ title, eyebrow, description, icon }: SectionHeaderProps) {
  return (
    <div className="section-header">
      {icon ? <span className="section-header__icon">{icon}</span> : null}
      <div className="section-header__text">
        {eyebrow ? <p className="section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="section-header__title">{title}</h2>
        {description ? <p className="section-header__desc">{description}</p> : null}
      </div>
    </div>
  );
}
