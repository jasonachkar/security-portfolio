import { motion } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { Finding } from '../../store/usePortfolioStore';

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ff3366', bg: 'rgba(255,51,102,0.1)', icon: AlertCircle },
  HIGH: { color: '#ff6b35', bg: 'rgba(255,107,53,0.1)', icon: AlertTriangle },
  MEDIUM: { color: '#ffaa00', bg: 'rgba(255,170,0,0.1)', icon: AlertTriangle },
  LOW: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)', icon: Info },
  INFO: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: CheckCircle },
} as const;

export default function FindingsPanel({
  findings,
  onClose,
}: {
  findings: Finding[];
  onClose: () => void;
}) {
  const summary = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: findings.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
    LOW: findings.filter((f) => f.severity === 'LOW').length,
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '380px',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Security Findings
          </h3>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {findings.length} findings across your infrastructure
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Summary badges */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {(Object.entries(summary) as [keyof typeof summary, number][]).map(
          ([sev, count]) => (
            <div
              key={sev}
              style={{
                background: SEVERITY_CONFIG[sev].bg,
                border: `1px solid ${SEVERITY_CONFIG[sev].color}44`,
                borderRadius: '20px',
                padding: '0.2rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: SEVERITY_CONFIG[sev].color,
              }}
            >
              {count} {sev}
            </div>
          )
        )}
        {findings.length === 0 && (
          <div style={{ color: 'var(--accent-green)', fontSize: '0.82rem' }}>
            ✅ No findings — clean infrastructure!
          </div>
        )}
      </div>

      {/* Findings list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {findings.map((finding) => {
          const { color, bg, icon: Icon } =
            SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.INFO;
          return (
            <motion.div
              key={finding.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: bg,
                border: `1px solid ${color}33`,
                borderLeft: `3px solid ${color}`,
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '0.6rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  marginBottom: '0.4rem',
                }}
              >
                <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                  }}
                >
                  {finding.title}
                </div>
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.4rem',
                  lineHeight: 1.5,
                }}
              >
                {finding.description}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  background: 'rgba(0,212,255,0.05)',
                  borderRadius: '4px',
                  padding: '0.4rem',
                  color: 'var(--accent-cyan)',
                  lineHeight: 1.5,
                }}
              >
                <strong>Fix:</strong> {finding.remediation}
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.3rem',
                }}
              >
                📐 {finding.framework}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
