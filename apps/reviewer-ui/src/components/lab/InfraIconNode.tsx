import { motion } from 'framer-motion';

type Cloud = 'aws' | 'azure' | 'gcp';

interface InfraIconNodeProps {
  label: string;
  nodeType: string;
  cloud: Cloud;
  color: string;
  short: string;
  selected: boolean;
  findingCount?: number;
}

const TYPE_TO_ICON: Record<string, string> = {
  vpc: 'network',
  ec2: 'compute',
  lambda: 'function',
  rds: 'database',
  s3: 'storage',
  'api-gateway': 'api',
  waf: 'shield',
  'security-group': 'firewall',
  'iam-role': 'identity',
  cloudtrail: 'logs',
  'nat-gateway': 'network',
  'load-balancer': 'balancer',
  'azure-vnet': 'network',
  'azure-vm': 'compute',
  'azure-function': 'function',
  'azure-sql': 'database',
  'azure-blob': 'storage',
  'azure-apim': 'api',
  'azure-waf': 'shield',
  'azure-nsg': 'firewall',
  'azure-ad': 'identity',
  'azure-key-vault': 'vault',
  'azure-monitor': 'logs',
  'azure-aks': 'cluster',
  'gcp-vpc': 'network',
  'gcp-compute': 'compute',
  'gcp-function': 'function',
  'gcp-sql': 'database',
  'gcp-storage': 'storage',
  'gcp-apigee': 'api',
  'gcp-armor': 'shield',
  'gcp-firewall': 'firewall',
  'gcp-iam': 'identity',
  'gcp-logging': 'logs',
  'gcp-gke': 'cluster',
  'gcp-lb': 'balancer',
};

function IconSvg({ kind, color }: { kind: string; color: string }) {
  const common = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (kind === 'storage') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <ellipse cx="20" cy="11" rx="13" ry="5" fill={color} opacity="0.18" {...common} />
        <path d="M7 11v18c0 3 6 5 13 5s13-2 13-5V11" fill={color} opacity="0.1" {...common} />
        <path d="M7 20c0 3 6 5 13 5s13-2 13-5" fill="none" opacity="0.65" {...common} />
      </svg>
    );
  }

  if (kind === 'database') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <ellipse cx="20" cy="10" rx="12" ry="5" fill={color} opacity="0.2" {...common} />
        <path d="M8 10v20c0 3 5 5 12 5s12-2 12-5V10" fill={color} opacity="0.1" {...common} />
        <path d="M8 20c0 3 5 5 12 5s12-2 12-5" fill="none" opacity="0.6" {...common} />
      </svg>
    );
  }

  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <path d="M20 4 33 10v10c0 8-5 13-13 17C12 33 7 28 7 20V10z" fill={color} opacity="0.13" {...common} />
        <path d="m14 20 4 4 9-10" fill="none" {...common} strokeWidth={2.5} />
      </svg>
    );
  }

  if (kind === 'firewall') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <rect x="6" y="7" width="28" height="26" rx="3" fill={color} opacity="0.1" {...common} />
        <path d="M6 16h28M6 24h28M15 7v26M25 7v26" fill="none" opacity="0.55" {...common} />
      </svg>
    );
  }

  if (kind === 'identity') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <circle cx="20" cy="13" r="7" fill={color} opacity="0.18" {...common} />
        <path d="M8 34c1.2-7 5.3-11 12-11s10.8 4 12 11" fill={color} opacity="0.1" {...common} />
        <path d="m26 24 3 3 6-7" fill="none" {...common} />
      </svg>
    );
  }

  if (kind === 'api') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <rect x="5" y="8" width="30" height="24" rx="5" fill={color} opacity="0.11" {...common} />
        <path d="M11 16h18M11 22h13M11 28h8" fill="none" opacity="0.8" {...common} />
      </svg>
    );
  }

  if (kind === 'function') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <rect x="6" y="6" width="28" height="28" rx="7" fill={color} opacity="0.12" {...common} />
        <path d="M15 27 20 13h5M14 18h12" fill="none" {...common} strokeWidth={2.3} />
      </svg>
    );
  }

  if (kind === 'logs') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <path d="M8 30 15 19l6 5 10-14" fill="none" {...common} strokeWidth={2.4} />
        <circle cx="8" cy="30" r="2.5" fill={color} />
        <circle cx="15" cy="19" r="2.5" fill={color} />
        <circle cx="21" cy="24" r="2.5" fill={color} />
        <circle cx="31" cy="10" r="2.5" fill={color} />
      </svg>
    );
  }

  if (kind === 'vault') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <rect x="8" y="18" width="24" height="16" rx="3" fill={color} opacity="0.12" {...common} />
        <path d="M13 18v-5c0-5 3-8 7-8s7 3 7 8v5" fill="none" {...common} strokeWidth={2.2} />
        <circle cx="20" cy="26" r="3" fill={color} opacity="0.45" />
      </svg>
    );
  }

  if (kind === 'cluster') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <circle cx="20" cy="20" r="12" fill={color} opacity="0.1" {...common} />
        <circle cx="20" cy="20" r="4" fill={color} opacity="0.45" />
        <circle cx="20" cy="7" r="3" fill={color} opacity="0.55" />
        <circle cx="31" cy="27" r="3" fill={color} opacity="0.55" />
        <circle cx="9" cy="27" r="3" fill={color} opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'balancer') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <circle cx="20" cy="9" r="5" fill={color} opacity="0.22" {...common} />
        <circle cx="10" cy="30" r="5" fill={color} opacity="0.22" {...common} />
        <circle cx="30" cy="30" r="5" fill={color} opacity="0.22" {...common} />
        <path d="M20 14v6M20 20H10v5M20 20h10v5" fill="none" {...common} />
      </svg>
    );
  }

  if (kind === 'network') {
    return (
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
        <rect x="5" y="5" width="30" height="30" rx="5" fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="20" cy="20" r="7" fill={color} opacity="0.16" {...common} />
        <path d="M5 20h8M27 20h8M20 5v8M20 27v8" fill="none" opacity="0.7" {...common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
      <rect x="7" y="9" width="26" height="20" rx="3" fill={color} opacity="0.12" {...common} />
      <path d="M12 15h16M12 22h16M15 33h10" fill="none" opacity="0.75" {...common} />
    </svg>
  );
}

export default function InfraIconNode({
  label,
  nodeType,
  cloud,
  color,
  short,
  selected,
  findingCount = 0,
}: InfraIconNodeProps) {
  const iconKind = TYPE_TO_ICON[nodeType] ?? 'generic';
  const alertColor = findingCount > 0 ? '#ff3366' : color;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}>
      <motion.div
        animate={
          findingCount > 0
            ? { boxShadow: ['0 0 0 rgba(255,51,102,0)', '0 0 16px rgba(255,51,102,0.55)', '0 0 0 rgba(255,51,102,0)'] }
            : selected
              ? { boxShadow: [`0 0 0 ${color}00`, `0 0 18px ${color}88`, `0 0 0 ${color}00`] }
              : {}
        }
        transition={{ repeat: selected || findingCount > 0 ? Infinity : 0, duration: 1.8 }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          border: `2px solid ${selected ? color : alertColor}`,
          background: `${alertColor}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <IconSvg kind={iconKind} color={alertColor} />
        {findingCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 20,
              height: 20,
              borderRadius: 999,
              background: '#ff3366',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.62rem',
              fontWeight: 900,
              border: '2px solid var(--bg-card)',
            }}
          >
            {findingCount}
          </span>
        )}
      </motion.div>

      <div style={{ minWidth: 0, textAlign: 'left' }}>
        <div style={{ color, fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.04em' }}>
          {cloud.toUpperCase()} / {short}
        </div>
        <div
          style={{
            color: 'var(--text-primary)',
            fontSize: '0.72rem',
            fontWeight: 850,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
