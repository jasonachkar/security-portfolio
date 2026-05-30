import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, FlaskConical } from 'lucide-react';
import InfraDesigner, { type CloudMode } from '../components/lab/InfraDesigner';

const CLOUD_OPTIONS: Array<{
  id: CloudMode;
  label: string;
  accent: string;
  summary: string;
  examples: string;
}> = [
  {
    id: 'aws',
    label: 'AWS',
    accent: '#ff9900',
    summary: 'Model AWS network, compute, storage, IAM, and audit controls.',
    examples: 'EC2, S3, RDS, WAF, CloudTrail',
  },
  {
    id: 'azure',
    label: 'Azure',
    accent: '#00a4ef',
    summary: 'Model Azure public ingress, identity, data, and monitoring controls.',
    examples: 'VM, Blob, SQL, APIM, Key Vault',
  },
  {
    id: 'gcp',
    label: 'GCP',
    accent: '#34a853',
    summary: 'Model GCP compute, storage, IAM, firewall, and logging controls.',
    examples: 'GCE, GCS, Cloud SQL, Armor, GKE',
  },
  {
    id: 'multi',
    label: 'Multi-Cloud',
    accent: '#a855f7',
    summary: 'Mix AWS, Azure, and GCP resources on one evidence canvas.',
    examples: 'All 36 provider nodes',
  },
];

export default function Lab() {
  const [selectedCloud, setSelectedCloud] = useState<CloudMode | null>(null);

  if (!selectedCloud) {
    return (
      <main
        style={{
          minHeight: '100vh',
          padding: '86px 1.5rem 2rem',
          background: 'var(--bg-primary)',
        }}
      >
        <section
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--accent-cyan)',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                marginBottom: '0.75rem',
              }}
            >
              <FlaskConical size={15} />
              INFRA LAB
            </div>
            <h1
              style={{
                color: 'var(--text-primary)',
                fontSize: 'clamp(2rem, 5vw, 4rem)',
                letterSpacing: 0,
                marginBottom: '0.75rem',
              }}
            >
              Choose a cloud model
            </h1>
            <p
              style={{
                color: 'var(--text-muted)',
                maxWidth: 760,
                lineHeight: 1.7,
                fontSize: '0.98rem',
              }}
            >
              Build a defensive architecture graph, validate security posture, generate
              demonstration HCL, and keep the claims bounded to a portfolio-grade lab.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
            }}
          >
            {CLOUD_OPTIONS.map((cloud) => (
              <motion.button
                key={cloud.id}
                type="button"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCloud(cloud.id)}
                style={{
                  minHeight: 188,
                  textAlign: 'left',
                  background: 'var(--bg-card)',
                  border: `1px solid ${cloud.accent}55`,
                  borderLeft: `4px solid ${cloud.accent}`,
                  borderRadius: 10,
                  padding: '1.15rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  boxShadow: `0 18px 40px -30px ${cloud.accent}`,
                }}
              >
                <Cloud size={22} color={cloud.accent} />
                <h2 style={{ marginTop: '1rem', fontSize: '1.15rem', color: cloud.accent }}>
                  {cloud.label}
                </h2>
                <p
                  style={{
                    marginTop: '0.55rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.55,
                    fontSize: '0.86rem',
                  }}
                >
                  {cloud.summary}
                </p>
                <div
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}
                >
                  {cloud.examples}
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        height: '100vh',
        paddingTop: '52px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
      }}
    >
      <header
        style={{
          height: 58,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>Infra Lab</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
            Multi-cloud security posture canvas with local validation and demo HCL export
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
          {CLOUD_OPTIONS.map((cloud) => {
            const active = selectedCloud === cloud.id;
            return (
              <button
                key={cloud.id}
                type="button"
                onClick={() => setSelectedCloud(cloud.id)}
                style={{
                  border: `1px solid ${active ? cloud.accent : 'var(--border)'}`,
                  background: active ? `${cloud.accent}18` : 'transparent',
                  color: active ? cloud.accent : 'var(--text-muted)',
                  borderRadius: 7,
                  padding: '0.42rem 0.7rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cloud.label}
              </button>
            );
          })}
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <InfraDesigner cloudMode={selectedCloud} onCloudModeChange={setSelectedCloud} />
      </div>
    </main>
  );
}
