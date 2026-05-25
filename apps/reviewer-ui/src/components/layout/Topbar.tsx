import { ShieldCheck } from 'lucide-react';
import type { NavRoute } from '../../app/routes';

export function Topbar({ route }: { route: NavRoute }) {
  return (
    <header className="topbar">
      <div className="topbar__titles">
        <p className="topbar__eyebrow">{route.eyebrow}</p>
        {route.home ? (
          <p className="topbar__title topbar__title--home">{route.title}</p>
        ) : (
          <h1 className="topbar__title">{route.title}</h1>
        )}
      </div>
      <span className="mode-pill" title="Defensive lab defaults">
        <ShieldCheck size={14} aria-hidden />
        cloud-demo safe · allowlisted
      </span>
    </header>
  );
}
