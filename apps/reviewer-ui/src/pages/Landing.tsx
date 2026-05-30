import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, ChevronRight } from 'lucide-react';
import { usePortfolioStore } from '../store/usePortfolioStore';

interface CVETicker {
  id: string;
  severity: string;
  description: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ff3366',
  HIGH: '#ff6b35',
  MEDIUM: '#ffaa00',
  LOW: '#00ff88',
  NONE: '#64748b',
};

export default function Landing() {
  const navigate = useNavigate();
  const { setCVEs } = usePortfolioStore();
  const [tickerItems, setTickerItems] = useState<CVETicker[]>([]);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  useEffect(() => {
    // Fetch CVEs from scan-engine (live NVD feed, or bundled real samples).
    fetch('/api/threats/cves')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCVEs(d.data);
          setTickerItems(
            d.data.slice(0, 12).map((c: any) => ({
              id: c.id,
              severity: c.severity,
              description: c.description.slice(0, 80) + '...',
            }))
          );
        }
      })
      .catch(() => {
        setTickerItems([
          {
            id: 'CVE-2024-3094',
            severity: 'CRITICAL',
            description: 'Malicious backdoor in xz/liblzma enabling SSH bypass...',
          },
          {
            id: 'CVE-2021-44228',
            severity: 'CRITICAL',
            description: 'Apache Log4j2 JNDI remote code execution (Log4Shell)...',
          },
        ]);
      });
  }, [setCVEs]);

  useEffect(() => {
    const lines = [
      '> Initializing security assessment platform...',
      '> Loading threat intelligence feeds...',
      '> NVD CVE feed: connected ✓',
      '> GreyNoise feed: connected ✓',
      '> Shodan InternetDB: connected ✓',
      '> Scan engine: online ✓',
      '> Platform ready. Welcome.',
    ];
    const interval = setInterval(() => {
      setTerminalLines((prev) => {
        if (prev.length >= lines.length) {
          clearInterval(interval);
          return prev;
        }
        return [...prev, lines[prev.length]];
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '56px',
        overflow: 'hidden',
      }}
    >
      {/* CVE Ticker Bar */}
      <div
        style={{
          background: 'rgba(255,51,102,0.08)',
          borderBottom: '1px solid rgba(255,51,102,0.3)',
          padding: '0.4rem 1rem',
          display: 'flex',
          gap: '2rem',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={12} color="#ff3366" />
          <span style={{ fontSize: '0.72rem', color: '#ff3366', fontWeight: 700 }}>
            CVE FEED
          </span>
        </div>
        <motion.div
          animate={{ x: [0, -2000] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}
        >
          {tickerItems.concat(tickerItems).map((item, i) => (
            <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span
                style={{
                  color: SEVERITY_COLORS[item.severity] || '#fff',
                  fontWeight: 700,
                }}
              >
                [{item.severity}]
              </span>{' '}
              {item.id}: {item.description}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Hero */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          position: 'relative',
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', zIndex: 1 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <Shield size={48} color="var(--accent-cyan)" />
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: '1rem',
              background:
                'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-green) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CLOUD SECURITY
          </h1>
          <h2
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
              fontWeight: 400,
              color: 'var(--text-muted)',
              marginBottom: '3rem',
              letterSpacing: '0.15em',
            }}
          >
            INTERACTIVE SECURITY PORTFOLIO — JASON ACHKAR DIAB
          </h2>

          {/* Terminal box */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '600px',
              margin: '0 auto 3rem',
              textAlign: 'left',
              fontFamily: 'monospace',
            }}
          >
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'block' }} />
            </div>
            {terminalLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: '0.82rem',
                  color: (line ?? '').includes('✓')
                    ? 'var(--accent-green)'
                    : (line ?? '').includes('ready')
                      ? 'var(--accent-cyan)'
                      : 'var(--text-muted)',
                  marginBottom: '0.25rem',
                }}
              >
                {line}
              </motion.div>
            ))}
            {terminalLines.length > 0 && terminalLines.length < 7 && (
              <span style={{ color: 'var(--accent-cyan)', animation: 'blink 1s infinite' }}>
                █
              </span>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,212,255,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/lab')}
            style={{
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
              border: 'none',
              borderRadius: '8px',
              padding: '1rem 2.5rem',
              color: '#0a0e1a',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              letterSpacing: '0.05em',
            }}
          >
            ENTER THE LAB <ChevronRight size={18} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
