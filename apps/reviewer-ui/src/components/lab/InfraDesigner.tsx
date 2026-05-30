import { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import InfraNodeComponent from './InfraNodeComponent';
import FindingsPanel from './FindingsPanel';

const NODE_TYPES_CONFIG = [
  { type: 'vpc', label: 'VPC', icon: '🌐', color: '#00d4ff' },
  { type: 'ec2', label: 'EC2', icon: '💻', color: '#00ff88' },
  { type: 's3', label: 'S3 Bucket', icon: '🪣', color: '#ffaa00' },
  { type: 'lambda', label: 'Lambda', icon: 'λ', color: '#a855f7' },
  { type: 'rds', label: 'RDS', icon: '🗄', color: '#3b82f6' },
  { type: 'api-gateway', label: 'API Gateway', icon: '🚪', color: '#f59e0b' },
  { type: 'waf', label: 'WAF', icon: '🛡', color: '#10b981' },
  { type: 'security-group', label: 'Security Group', icon: '🔒', color: '#ef4444' },
  { type: 'iam-role', label: 'IAM Role', icon: '👤', color: '#8b5cf6' },
  { type: 'cloudtrail', label: 'CloudTrail', icon: '📋', color: '#06b6d4' },
  { type: 'nat-gateway', label: 'NAT Gateway', icon: '🔀', color: '#14b8a6' },
  { type: 'load-balancer', label: 'Load Balancer', icon: '⚖️', color: '#f97316' },
];

const nodeTypes: NodeTypes = {
  infraNode: InfraNodeComponent,
};

let idCounter = 1;

export default function InfraDesigner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [terraformOutput, setTerraformOutput] = useState<string | null>(null);
  const { setInfraFindings, infraFindings } = usePortfolioStore();

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, animated: true, style: { stroke: 'var(--accent-cyan)' } },
          eds
        )
      ),
    [setEdges]
  );

  const addNode = (type: string, label: string) => {
    const id = `node-${idCounter++}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'infraNode',
        position: { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 },
        data: { type, label, config: {} },
      },
    ]);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const graph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type,
          label: n.data.label,
          config: n.data.config,
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      };

      const res = await fetch('/api/infra/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph),
      });
      const data = await res.json();
      if (data.success) {
        setInfraFindings(data.findings);
        setShowFindings(true);

        // Color nodes by their worst finding severity.
        setNodes((nds) =>
          nds.map((n) => {
            const nodeFindings = data.findings.filter(
              (f: { nodeId: string }) => f.nodeId === n.id
            );
            const worstSeverity = nodeFindings[0]?.severity;
            const borderColor =
              worstSeverity === 'CRITICAL'
                ? '#ff3366'
                : worstSeverity === 'HIGH'
                  ? '#ff6b35'
                  : worstSeverity === 'MEDIUM'
                    ? '#ffaa00'
                    : undefined;
            return {
              ...n,
              data: { ...n.data, borderColor, findingCount: nodeFindings.length },
            };
          })
        );
      }
    } catch (e) {
      console.error(e);
    }
    setIsValidating(false);
  };

  const handleExportTerraform = async () => {
    const graph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        config: n.data.config,
      })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    const res = await fetch('/api/infra/terraform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graph),
    });
    const data = await res.json();
    if (data.success) setTerraformOutput(data.terraform);
  };

  const handleClearAll = () => {
    setNodes([]);
    setEdges([]);
    setInfraFindings([]);
    setShowFindings(false);
    setTerraformOutput(null);
  };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Left sidebar — node palette */}
      <div
        style={{
          width: '200px',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          padding: '1rem 0.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            marginBottom: '0.5rem',
          }}
        >
          CLICK TO ADD
        </div>
        {NODE_TYPES_CONFIG.map(({ type, label, icon, color }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.03, x: 2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => addNode(type, label)}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${color}33`,
              borderLeft: `3px solid ${color}`,
              borderRadius: '6px',
              padding: '0.5rem 0.75rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.78rem',
              fontWeight: 500,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{icon}</span>
            {label}
          </motion.button>
        ))}

        {/* Action buttons */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleValidate}
            disabled={isValidating || nodes.length === 0}
            style={{
              background: isValidating
                ? 'rgba(0,212,255,0.2)'
                : 'linear-gradient(135deg, #00d4ff, #00ff88)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.6rem',
              color: '#0a0e1a',
              cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.78rem',
              fontWeight: 800,
              opacity: nodes.length === 0 ? 0.5 : 1,
            }}
          >
            {isValidating ? '⏳ Scanning...' : '🔍 Validate'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={handleExportTerraform}
            disabled={nodes.length === 0}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--accent-purple)',
              borderRadius: '6px',
              padding: '0.6rem',
              color: 'var(--accent-purple)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              opacity: nodes.length === 0 ? 0.5 : 1,
            }}
          >
            📄 Export HCL
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={handleClearAll}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.6rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.78rem',
            }}
          >
            🗑 Clear All
          </motion.button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🏗</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', opacity: 0.5 }}>
              Click components on the left to add them to the canvas
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                opacity: 0.4,
                marginTop: '0.5rem',
              }}
            >
              Connect nodes by dragging between handles, then click Validate
            </div>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: 'var(--bg-primary)' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(0,212,255,0.08)"
          />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              const cfg = NODE_TYPES_CONFIG.find((c) => c.type === n.data?.type);
              return cfg?.color || '#64748b';
            }}
            maskColor="rgba(10,14,26,0.8)"
          />
        </ReactFlow>
      </div>

      {/* Findings panel */}
      <AnimatePresence>
        {showFindings && (
          <FindingsPanel findings={infraFindings} onClose={() => setShowFindings(false)} />
        )}
      </AnimatePresence>

      {/* Terraform modal */}
      <AnimatePresence>
        {terraformOutput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              padding: '2rem',
            }}
            onClick={() => setTerraformOutput(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-purple)',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h3 style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>
                  📄 Generated Terraform (HCL)
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(terraformOutput)}
                    style={{
                      background: 'rgba(168,85,247,0.2)',
                      border: '1px solid var(--accent-purple)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.8rem',
                      color: 'var(--accent-purple)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([terraformOutput], { type: 'text/plain' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = 'main.tf';
                      a.click();
                    }}
                    style={{
                      background: 'rgba(168,85,247,0.2)',
                      border: '1px solid var(--accent-purple)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.8rem',
                      color: 'var(--accent-purple)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    ⬇️ Download
                  </button>
                  <button
                    onClick={() => setTerraformOutput(null)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.8rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
              <pre
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: 'var(--accent-green)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {terraformOutput}
              </pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
