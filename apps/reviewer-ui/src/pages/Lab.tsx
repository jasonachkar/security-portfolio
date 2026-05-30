import { useState } from 'react';
import InfraDesigner from '../components/lab/InfraDesigner';
import ScannerPlayground from '../components/lab/ScannerPlayground';

export default function Lab() {
  const [activeTab, setActiveTab] = useState<'infra' | 'scanner'>('infra');

  return (
    <div
      style={{
        height: '100vh',
        paddingTop: '56px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        {[
          { id: 'infra', label: '🏗  Infra Designer', desc: 'Build & validate cloud architecture' },
          { id: 'scanner', label: '🔍  Scanner Playground', desc: 'Run security tools' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'infra' | 'scanner')}
            style={{
              padding: '1rem 2rem',
              background: activeTab === tab.id ? 'rgba(0,212,255,0.08)' : 'transparent',
              borderBottom:
                activeTab === tab.id
                  ? '2px solid var(--accent-cyan)'
                  : '2px solid transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
          >
            {tab.label}
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 400,
                opacity: 0.6,
                marginTop: '2px',
              }}
            >
              {tab.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'infra' ? <InfraDesigner /> : <ScannerPlayground />}
      </div>
    </div>
  );
}
