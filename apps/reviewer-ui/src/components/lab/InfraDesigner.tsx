import { useRef, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Download, Link2, Play, RotateCcw, Trash2 } from 'lucide-react';
import { usePortfolioStore, type Finding } from '../../store/usePortfolioStore';
import FindingsPanel from './FindingsPanel';
import InfraIconNode from './InfraIconNode';

export type CloudMode = 'aws' | 'azure' | 'gcp' | 'multi';
type CloudProvider = Exclude<CloudMode, 'multi'>;

interface NodeDefinition {
  type: string;
  label: string;
  short: string;
  cloud: CloudProvider;
  color: string;
  config: Record<string, unknown>;
}

interface InfraNode {
  id: string;
  type: string;
  label: string;
  cloud: CloudProvider;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  borderColor?: string;
  findingCount?: number;
}

interface InfraEdge {
  id: string;
  source: string;
  target: string;
}

const NODE_WIDTH = 146;
const NODE_HEIGHT = 78;

const AWS_NODES: NodeDefinition[] = [
  { type: 'vpc', label: 'VPC', short: 'VPC', cloud: 'aws', color: '#ff9900', config: {} },
  { type: 'ec2', label: 'EC2', short: 'EC2', cloud: 'aws', color: '#ff9900', config: { public_ip: true, ssh_open: true } },
  { type: 's3', label: 'S3 Bucket', short: 'S3', cloud: 'aws', color: '#ff9900', config: { public_access: true, encryption: false, versioning: false } },
  { type: 'lambda', label: 'Lambda', short: 'FN', cloud: 'aws', color: '#ff9900', config: { public_url: true, resource_policy: false } },
  { type: 'rds', label: 'RDS', short: 'RDS', cloud: 'aws', color: '#ff9900', config: { publicly_accessible: true, encryption: false, deletion_protection: false } },
  { type: 'api-gateway', label: 'API Gateway', short: 'API', cloud: 'aws', color: '#ff9900', config: {} },
  { type: 'waf', label: 'WAF', short: 'WAF', cloud: 'aws', color: '#ff9900', config: {} },
  { type: 'security-group', label: 'Security Group', short: 'SG', cloud: 'aws', color: '#ff9900', config: { allow_all_inbound: true } },
  { type: 'iam-role', label: 'IAM Role', short: 'IAM', cloud: 'aws', color: '#ff9900', config: { admin_policy: true, no_mfa: true } },
  { type: 'cloudtrail', label: 'CloudTrail', short: 'LOG', cloud: 'aws', color: '#ff9900', config: {} },
  { type: 'nat-gateway', label: 'NAT Gateway', short: 'NAT', cloud: 'aws', color: '#ff9900', config: {} },
  { type: 'load-balancer', label: 'Load Balancer', short: 'LB', cloud: 'aws', color: '#ff9900', config: {} },
];

const AZURE_NODES: NodeDefinition[] = [
  { type: 'azure-vnet', label: 'VNet', short: 'VNET', cloud: 'azure', color: '#00a4ef', config: {} },
  { type: 'azure-vm', label: 'VM', short: 'VM', cloud: 'azure', color: '#00a4ef', config: { public_ip: true, ssh_open: true, rdp_open: true } },
  { type: 'azure-blob', label: 'Blob Storage', short: 'BLOB', cloud: 'azure', color: '#00a4ef', config: { public_access: true, encryption: false } },
  { type: 'azure-function', label: 'Azure Function', short: 'FUNC', cloud: 'azure', color: '#00a4ef', config: { public_endpoint: true } },
  { type: 'azure-sql', label: 'Azure SQL', short: 'SQL', cloud: 'azure', color: '#00a4ef', config: { public_network_access: true, audit_enabled: false } },
  { type: 'azure-apim', label: 'API Management', short: 'APIM', cloud: 'azure', color: '#00a4ef', config: {} },
  { type: 'azure-waf', label: 'Azure WAF', short: 'WAF', cloud: 'azure', color: '#00a4ef', config: {} },
  { type: 'azure-nsg', label: 'NSG', short: 'NSG', cloud: 'azure', color: '#00a4ef', config: { allow_all_inbound: true } },
  { type: 'azure-ad', label: 'Azure AD', short: 'AAD', cloud: 'azure', color: '#00a4ef', config: { privileged_without_pim: true } },
  { type: 'azure-key-vault', label: 'Key Vault', short: 'KV', cloud: 'azure', color: '#00a4ef', config: { public_network_access: true } },
  { type: 'azure-monitor', label: 'Azure Monitor', short: 'MON', cloud: 'azure', color: '#00a4ef', config: {} },
  { type: 'azure-aks', label: 'AKS', short: 'AKS', cloud: 'azure', color: '#00a4ef', config: { public_api: true } },
];

const GCP_NODES: NodeDefinition[] = [
  { type: 'gcp-vpc', label: 'VPC Network', short: 'VPC', cloud: 'gcp', color: '#34a853', config: {} },
  { type: 'gcp-compute', label: 'Compute Engine', short: 'GCE', cloud: 'gcp', color: '#34a853', config: { public_ip: true, ssh_open: true } },
  { type: 'gcp-storage', label: 'Cloud Storage', short: 'GCS', cloud: 'gcp', color: '#34a853', config: { public_access: true, uniform_access: false } },
  { type: 'gcp-function', label: 'Cloud Function', short: 'FUNC', cloud: 'gcp', color: '#34a853', config: { public_invoker: true } },
  { type: 'gcp-sql', label: 'Cloud SQL', short: 'SQL', cloud: 'gcp', color: '#34a853', config: { public_ip: true, backups: false } },
  { type: 'gcp-apigee', label: 'Apigee', short: 'API', cloud: 'gcp', color: '#34a853', config: {} },
  { type: 'gcp-armor', label: 'Cloud Armor', short: 'WAF', cloud: 'gcp', color: '#34a853', config: {} },
  { type: 'gcp-firewall', label: 'Firewall Rule', short: 'FW', cloud: 'gcp', color: '#34a853', config: { allow_all_inbound: true } },
  { type: 'gcp-iam', label: 'Cloud IAM', short: 'IAM', cloud: 'gcp', color: '#34a853', config: { primitive_role: true } },
  { type: 'gcp-logging', label: 'Cloud Logging', short: 'LOG', cloud: 'gcp', color: '#34a853', config: {} },
  { type: 'gcp-gke', label: 'GKE', short: 'GKE', cloud: 'gcp', color: '#34a853', config: { public_cluster: true } },
  { type: 'gcp-lb', label: 'Cloud Load Balancer', short: 'LB', cloud: 'gcp', color: '#34a853', config: {} },
];

const ALL_NODE_TYPES = [...AWS_NODES, ...AZURE_NODES, ...GCP_NODES];

let idCounter = 1;

function nodeCenter(node: InfraNode) {
  return {
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  };
}

function edgePath(source: InfraNode, target: InfraNode) {
  const start = nodeCenter(source);
  const end = nodeCenter(target);
  const midY = (start.y + end.y) / 2;
  return `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
}

function finding(
  node: InfraNode,
  severity: Finding['severity'],
  title: string,
  description: string,
  remediation: string,
  framework: string
): Finding {
  return {
    id: `${node.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    nodeId: node.id,
    severity,
    title,
    description,
    remediation,
    framework,
  };
}

function localValidate(nodes: InfraNode[], edges: InfraEdge[]): Finding[] {
  const findings: Finding[] = [];
  const hasType = (type: string) => nodes.some((node) => node.type === type);
  const linkedTo = (nodeId: string, type: string) =>
    edges.some((edge) => {
      const peerId =
        edge.source === nodeId ? edge.target : edge.target === nodeId ? edge.source : null;
      return peerId ? nodes.find((node) => node.id === peerId)?.type === type : false;
    });

  for (const node of nodes) {
    if (node.type === 's3' && node.config.public_access) {
      findings.push(finding(node, 'CRITICAL', 'S3 public access enabled', 'The bucket is modelled with public access enabled.', 'Enable account and bucket level Block Public Access.', 'CIS AWS 2.1.5'));
    }
    if (node.type === 'ec2' && (node.config.ssh_open || node.config.rdp_open)) {
      findings.push(finding(node, 'CRITICAL', 'Compute admin port open to internet', 'The compute node has SSH or RDP open to broad internet access.', 'Use private access, bastion, VPN, or session manager controls.', 'CIS AWS 5.2/5.3'));
    }
    if (node.type === 'security-group' && node.config.allow_all_inbound) {
      findings.push(finding(node, 'CRITICAL', 'Security group allows all inbound', 'The security group allows broad inbound traffic.', 'Replace broad ingress with least-privilege source and port rules.', 'CIS AWS 5.1'));
    }
    if (node.type === 'api-gateway' && !hasType('waf')) {
      findings.push(finding(node, 'HIGH', 'API Gateway missing WAF', 'The public API ingress has no linked WAF control.', 'Add WAF and managed API protection rules.', 'NIST 800-53 SI-3'));
    }
    if (node.type === 'azure-blob' && node.config.public_access) {
      findings.push(finding(node, 'CRITICAL', 'Azure Blob public access enabled', 'Blob public access is enabled in the model.', 'Disable public blob access and require private endpoints where practical.', 'CIS Azure 3.7'));
    }
    if (node.type === 'azure-nsg' && node.config.allow_all_inbound) {
      findings.push(finding(node, 'CRITICAL', 'Azure NSG allows all inbound', 'The NSG allows broad inbound access.', 'Constrain inbound rules to approved source CIDRs and ports.', 'CIS Azure 6.1'));
    }
    if (node.type === 'azure-vm' && (node.config.ssh_open || node.config.rdp_open)) {
      findings.push(finding(node, 'CRITICAL', 'Azure VM admin port exposed', 'SSH or RDP is open to broad internet access.', 'Use Bastion, JIT access, VPN, and restrictive NSG rules.', 'CIS Azure 6.2/6.3'));
    }
    if (node.type === 'azure-apim' && !linkedTo(node.id, 'azure-waf')) {
      findings.push(finding(node, 'HIGH', 'API Management missing WAF path', 'APIM is not linked to Azure WAF in the model.', 'Place WAF/Application Gateway in front of public APIs.', 'Azure Well-Architected Security'));
    }
    if (node.type === 'gcp-storage' && node.config.public_access) {
      findings.push(finding(node, 'CRITICAL', 'GCS bucket public', 'The Cloud Storage bucket is modelled as public.', 'Disable public access and enforce uniform bucket-level access.', 'CIS GCP 5.1'));
    }
    if (node.type === 'gcp-firewall' && node.config.allow_all_inbound) {
      findings.push(finding(node, 'CRITICAL', 'GCP firewall allows all inbound', 'The firewall rule allows broad inbound traffic.', 'Use least-privilege source ranges and explicit ports.', 'CIS GCP 3.6'));
    }
    if (node.type === 'gcp-iam' && node.config.primitive_role) {
      findings.push(finding(node, 'HIGH', 'GCP primitive IAM role assigned', 'Primitive Owner/Editor/Viewer-style access is represented.', 'Use predefined or custom roles with minimum required permissions.', 'CIS GCP 1.4'));
    }
    if (node.type === 'gcp-apigee' && !linkedTo(node.id, 'gcp-armor')) {
      findings.push(finding(node, 'HIGH', 'Apigee missing Cloud Armor path', 'The API ingress is not linked to Cloud Armor.', 'Add Cloud Armor policy and request filtering evidence.', 'Google Cloud Security Foundations'));
    }
  }

  if (nodes.some((node) => node.cloud === 'aws') && nodes.length > 2 && !hasType('cloudtrail')) {
    findings.push({
      id: 'global-no-cloudtrail',
      nodeId: '',
      severity: 'HIGH',
      title: 'AWS audit trail missing',
      description: 'AWS resources exist without a CloudTrail node on the canvas.',
      remediation: 'Add CloudTrail with multi-region logging and log integrity validation.',
      framework: 'CIS AWS 3.1',
    });
  }

  if (nodes.some((node) => node.cloud === 'azure') && nodes.length > 2 && !hasType('azure-monitor')) {
    findings.push({
      id: 'global-no-azure-monitor',
      nodeId: '',
      severity: 'HIGH',
      title: 'Azure monitoring evidence missing',
      description: 'Azure resources exist without Azure Monitor/Log Analytics evidence on the canvas.',
      remediation: 'Add Azure Monitor and route platform logs to a workspace.',
      framework: 'CIS Azure 5.x',
    });
  }

  if (nodes.some((node) => node.cloud === 'gcp') && nodes.length > 2 && !hasType('gcp-logging')) {
    findings.push({
      id: 'global-no-gcp-logging',
      nodeId: '',
      severity: 'HIGH',
      title: 'GCP logging evidence missing',
      description: 'GCP resources exist without Cloud Logging evidence on the canvas.',
      remediation: 'Add Cloud Logging sinks and retention evidence.',
      framework: 'CIS GCP 2.x',
    });
  }

  return findings;
}

function fallbackTerraform(nodes: InfraNode[], edges: InfraEdge[]) {
  return [
    '# Generated by the local portfolio lab designer.',
    '# Demonstration HCL only. Review and harden before adapting to real environments.',
    '',
    ...nodes.map((node) =>
      [
        `# ${node.cloud.toUpperCase()} - ${node.label}`,
        `resource "portfolio_lab_${node.cloud}_${node.type.replace(/-/g, '_')}" "${node.id.replace(/-/g, '_')}" {`,
        `  name = "${node.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"`,
        `  cloud = "${node.cloud}"`,
        '  evidence_required = true',
        '}',
        '',
      ].join('\n')
    ),
    ...edges.map((edge) => `# link ${edge.source} -> ${edge.target}`),
  ].join('\n');
}

export default function InfraDesigner({
  cloudMode,
}: {
  cloudMode: CloudMode;
  onCloudModeChange?: (mode: CloudMode) => void;
}) {
  const [nodes, setNodes] = useState<InfraNode[]>([]);
  const [edges, setEdges] = useState<InfraEdge[]>([]);
  const [selectedForLink, setSelectedForLink] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [terraformOutput, setTerraformOutput] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { setInfraFindings, infraFindings } = usePortfolioStore();

  const definitions =
    cloudMode === 'multi'
      ? ALL_NODE_TYPES
      : ALL_NODE_TYPES.filter((definition) => definition.cloud === cloudMode);

  const addNode = (definition: NodeDefinition) => {
    const id = `node-${idCounter++}`;
    const index = nodes.length;
    setNodes((current) => [
      ...current,
      {
        id,
        type: definition.type,
        label:
          cloudMode === 'multi'
            ? `${definition.cloud.toUpperCase()}: ${definition.label}`
            : definition.label,
        cloud: definition.cloud,
        position: {
          x: 120 + (index % 4) * 190,
          y: 80 + Math.floor(index / 4) * 128,
        },
        config: { ...definition.config },
      },
    ]);
  };

  const handleNodeClick = (nodeId: string) => {
    if (!selectedForLink) {
      setSelectedForLink(nodeId);
      return;
    }

    if (selectedForLink === nodeId) {
      setSelectedForLink(null);
      return;
    }

    const exists = edges.some(
      (edge) =>
        (edge.source === selectedForLink && edge.target === nodeId) ||
        (edge.source === nodeId && edge.target === selectedForLink)
    );

    if (!exists) {
      setEdges((current) => [
        ...current,
        { id: `edge-${selectedForLink}-${nodeId}`, source: selectedForLink, target: nodeId },
      ]);
    }
    setSelectedForLink(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const nextX = event.clientX - bounds.left - dragging.offsetX;
    const nextY = event.clientY - bounds.top - dragging.offsetY;
    const maxX = Math.max(0, bounds.width - NODE_WIDTH - 12);
    const maxY = Math.max(0, bounds.height - NODE_HEIGHT - 12);

    setNodes((current) =>
      current.map((node) =>
        node.id === dragging.id
          ? {
              ...node,
              position: {
                x: Math.min(maxX, Math.max(12, nextX)),
                y: Math.min(maxY, Math.max(12, nextY)),
              },
            }
          : node
      )
    );
  };

  const graph = () => ({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      config: node.config,
      cloud: node.cloud,
    })),
    edges,
  });

  const handleValidate = async () => {
    setIsValidating(true);
    let findings = localValidate(nodes, edges);

    try {
      const response = await fetch('/api/infra/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph()),
      });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.findings)) {
        findings = data.findings;
      }
    } catch {
      // Local fallback keeps the portfolio lab usable when the scan-engine is offline.
    }

    setInfraFindings(findings);
    setShowFindings(true);
    setNodes((current) =>
      current.map((node) => {
        const nodeFindings = findings.filter((finding) => finding.nodeId === node.id);
        const worstSeverity = nodeFindings[0]?.severity;
        const borderColor =
          worstSeverity === 'CRITICAL'
            ? '#ff3366'
            : worstSeverity === 'HIGH'
              ? '#ff6b35'
              : worstSeverity === 'MEDIUM'
                ? '#ffaa00'
                : worstSeverity === 'LOW'
                  ? '#00ff88'
                  : undefined;
        return { ...node, borderColor, findingCount: nodeFindings.length };
      })
    );
    setIsValidating(false);
  };

  const handleExport = async () => {
    let output = fallbackTerraform(nodes, edges);
    try {
      const response = await fetch('/api/infra/terraform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph()),
      });
      const data = await response.json();
      if (response.ok && data.success && data.terraform) {
        output = data.terraform;
      }
    } catch {
      // Fallback output is deterministic and clearly labelled.
    }
    setTerraformOutput(output);
  };

  const handleClearAll = () => {
    setNodes([]);
    setEdges([]);
    setSelectedForLink(null);
    setInfraFindings([]);
    setShowFindings(false);
    setTerraformOutput(null);
  };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <aside
        aria-label="Cloud resource palette"
        style={{
          width: 64,
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          padding: '0.7rem 0.45rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.42rem',
        }}
      >
        {definitions.map((definition) => (
          <motion.button
            key={`${definition.cloud}-${definition.type}`}
            type="button"
            title={`${definition.cloud.toUpperCase()} ${definition.label}`}
            aria-label={`Add ${definition.cloud.toUpperCase()} ${definition.label}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => addNode(definition)}
            style={{
              width: 46,
              height: 42,
              borderRadius: 8,
              border: `1px solid ${definition.color}55`,
              background: `${definition.color}12`,
              color: definition.color,
              cursor: 'pointer',
              fontSize: '0.64rem',
              fontWeight: 900,
              letterSpacing: '0.03em',
            }}
          >
            {definition.short}
          </motion.button>
        ))}
      </aside>

      <div
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 1px 1px, rgba(0,212,255,0.15) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      >
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
              textAlign: 'center',
              padding: '1rem',
            }}
          >
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
              Add cloud components from the left palette
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                maxWidth: 520,
                marginTop: '0.5rem',
              }}
            >
              Click a component to place it. Click one node, then another, to create a
              defensive architecture link. Validate to generate evidence-backed findings.
            </p>
          </div>
        )}

        {selectedForLink && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              zIndex: 20,
              background: 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.35)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              color: 'var(--accent-cyan)',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <Link2 size={14} />
            Link mode: select a second node
          </div>
        )}

        <svg
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>
            <marker id="infra-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent-cyan)" opacity="0.75" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const source = nodes.find((node) => node.id === edge.source);
            const target = nodes.find((node) => node.id === edge.target);
            if (!source || !target) return null;
            return (
              <path
                key={edge.id}
                d={edgePath(source, target)}
                fill="none"
                stroke="var(--accent-cyan)"
                strokeWidth="2"
                strokeOpacity="0.76"
                markerEnd="url(#infra-arrow)"
              />
            );
          })}
        </svg>

        {nodes.map((node) => {
          const color = node.borderColor ?? ALL_NODE_TYPES.find((definition) => definition.type === node.type)?.color ?? '#64748b';
          const selected = selectedForLink === node.id;
          const short = ALL_NODE_TYPES.find((definition) => definition.type === node.type)?.short ?? 'RES';
          return (
            <motion.button
              key={node.id}
              type="button"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => handleNodeClick(node.id)}
              onPointerDown={(event) => {
                if (!canvasRef.current) return;
                const bounds = canvasRef.current.getBoundingClientRect();
                setDragging({
                  id: node.id,
                  offsetX: event.clientX - bounds.left - node.position.x,
                  offsetY: event.clientY - bounds.top - node.position.y,
                });
              }}
              style={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                background: 'var(--bg-card)',
                border: `2px solid ${selected ? 'var(--accent-cyan)' : color}`,
                borderRadius: '10px',
                padding: '0.58rem 0.68rem',
                textAlign: 'center',
                boxShadow: selected ? '0 0 20px rgba(0,212,255,0.45)' : `0 0 12px ${color}33`,
                cursor: dragging?.id === node.id ? 'grabbing' : 'grab',
                color: 'var(--text-primary)',
                zIndex: selected ? 12 : 8,
              }}
            >
              <InfraIconNode
                label={node.label}
                nodeType={node.type}
                cloud={node.cloud}
                color={color}
                short={short}
                selected={selected}
                findingCount={node.findingCount}
              />
            </motion.button>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem',
            background: 'rgba(15,22,41,0.92)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
            maxWidth: 'calc(100% - 2rem)',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || nodes.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: nodes.length === 0 ? 'rgba(100,116,139,0.18)' : 'linear-gradient(135deg, #00d4ff, #00ff88)',
              border: 'none',
              borderRadius: 8,
              padding: '0.55rem 0.78rem',
              color: nodes.length === 0 ? 'var(--text-muted)' : '#0a0e1a',
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Play size={14} />
            {isValidating ? 'Validating' : 'Validate'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={nodes.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--accent-purple)',
              borderRadius: 8,
              padding: '0.55rem 0.78rem',
              color: 'var(--accent-purple)',
              opacity: nodes.length === 0 ? 0.42 : 1,
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Download size={14} />
            Export HCL
          </button>
          {infraFindings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFindings(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(255,170,0,0.12)',
                border: '1px solid rgba(255,170,0,0.38)',
                borderRadius: 8,
                padding: '0.55rem 0.78rem',
                color: '#ffaa00',
                fontSize: '0.78rem',
                fontWeight: 900,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <AlertTriangle size={14} />
              {infraFindings.length} Findings
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedForLink(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.55rem 0.68rem',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <RotateCcw size={14} />
            Cancel Link
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.55rem 0.68rem',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFindings && (
          <FindingsPanel findings={infraFindings} onClose={() => setShowFindings(false)} />
        )}
      </AnimatePresence>

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
              onClick={(event) => event.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-purple)',
                borderRadius: 12,
                padding: '1.25rem',
                maxWidth: 860,
                width: '100%',
                maxHeight: '82vh',
                overflow: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <h2 style={{ color: 'var(--accent-purple)', fontSize: '1rem' }}>
                  Generated Terraform-style HCL
                </h2>
                <button
                  type="button"
                  onClick={() => setTerraformOutput(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '0.35rem 0.75rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
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
