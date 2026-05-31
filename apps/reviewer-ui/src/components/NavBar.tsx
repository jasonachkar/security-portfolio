import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, Globe, Network, ShieldAlert, Lock } from 'lucide-react';

const links = [
  { to: '/lab', label: 'Infra Lab', icon: FlaskConical, color: '#00d4ff' },
  { to: '/threat-map', label: 'Threat Map', icon: Globe, color: '#ff3366' },
  { to: '/network', label: 'Network Analyzer', icon: Network, color: '#00ff88' },
  { to: '/scanner', label: 'Vuln Scanner', icon: ShieldAlert, color: '#ffaa00' },
  { to: '/gateway', label: 'API Gateway', icon: Lock, color: '#a855f7' },
];

export default function NavBar() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary tool navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(10,14,26,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        height: '52px',
        gap: '1rem',
      }}
    >
      <Link
        to="/lab"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 900,
            color: '#0a0e1a',
          }}
        >
          JA
        </span>
        <span
          style={{
            color: 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.76rem',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          CLOUD SEC PORTFOLIO
        </span>
      </Link>

      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          minWidth: 0,
          overflowX: 'auto',
        }}
      >
        {links.map(({ to, label, icon: Icon, color }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  background: active ? `${color}18` : 'transparent',
                  border: `1px solid ${active ? `${color}66` : 'transparent'}`,
                  color: active ? color : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
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
