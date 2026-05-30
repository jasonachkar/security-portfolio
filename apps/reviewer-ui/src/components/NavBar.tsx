import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FlaskConical, Globe, FolderGit2, User } from 'lucide-react';

const links = [
  { to: '/', label: 'Home', icon: Shield },
  { to: '/lab', label: 'Lab', icon: FlaskConical },
  { to: '/threat-map', label: 'Threat Map', icon: Globe },
  { to: '/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/about', label: 'About', icon: User },
];

export default function NavBar() {
  const { pathname } = useLocation();

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(10,14,26,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        height: '56px',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span
          style={{
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            fontSize: '0.95rem',
            letterSpacing: '0.05em',
          }}
        >
          JASON ACHKAR
          <span style={{ color: 'var(--accent-green)', marginLeft: '0.5rem' }}>
            // CLOUD SEC
          </span>
        </span>
      </Link>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent-cyan)' : 'transparent'}`,
                  color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                {label}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
