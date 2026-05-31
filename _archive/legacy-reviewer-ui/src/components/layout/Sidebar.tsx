import { NavLink } from 'react-router-dom';
import { Github, ShieldHalf } from 'lucide-react';
import { NAV_ROUTES } from '../../app/routes';
import { GITHUB_BASE_URL } from '../shared/ProofLink';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-brand" aria-label="Defensive Security Platform Lab — Start Here">
        <span className="sidebar-brand__mark" aria-hidden>
          <ShieldHalf size={20} />
        </span>
        <span className="sidebar-brand__text">
          <strong>DSP Lab</strong>
          <span>Defensive Security Platform</span>
        </span>
      </NavLink>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ROUTES.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink
              key={route.path}
              to={route.path}
              end={route.home}
              aria-label={route.label}
              title={route.label}
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={17} />
              <span>{route.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <a
        className="sidebar-foot"
        href={GITHUB_BASE_URL.replace('/blob/refactor/defensive-security-platform-lab/', '')}
        target="_blank"
        rel="noreferrer"
      >
        <Github size={15} />
        <span>jasonachkar/security-portfolio</span>
      </a>
    </aside>
  );
}
