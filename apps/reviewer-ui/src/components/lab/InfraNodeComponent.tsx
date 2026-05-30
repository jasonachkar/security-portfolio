import { Handle, Position, type NodeProps } from 'reactflow';

const NODE_ICONS: Record<string, string> = {
  vpc: '🌐',
  ec2: '💻',
  s3: '🪣',
  lambda: 'λ',
  rds: '🗄',
  'api-gateway': '🚪',
  waf: '🛡',
  'security-group': '🔒',
  'iam-role': '👤',
  cloudtrail: '📋',
  'nat-gateway': '🔀',
  'load-balancer': '⚖️',
};

const NODE_COLORS: Record<string, string> = {
  vpc: '#00d4ff',
  ec2: '#00ff88',
  s3: '#ffaa00',
  lambda: '#a855f7',
  rds: '#3b82f6',
  'api-gateway': '#f59e0b',
  waf: '#10b981',
  'security-group': '#ef4444',
  'iam-role': '#8b5cf6',
  cloudtrail: '#06b6d4',
  'nat-gateway': '#14b8a6',
  'load-balancer': '#f97316',
};

export default function InfraNodeComponent({ data }: NodeProps) {
  const color = data.borderColor || NODE_COLORS[data.type] || '#64748b';
  const icon = NODE_ICONS[data.type] || '📦';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `2px solid ${color}`,
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        minWidth: '120px',
        textAlign: 'center',
        boxShadow: `0 0 12px ${color}33`,
        cursor: 'grab',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, border: 'none', width: 8, height: 8 }}
      />

      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
        {data.type}
      </div>

      {data.findingCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            background: data.borderColor || '#ff3366',
            color: '#fff',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: 800,
          }}
        >
          {data.findingCount}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
}
