import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface Tool {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  endpoint: string;
  targets: string[];
  targetLabel: string;
  bodyKey: string;
  customBody?: boolean;
}

const TOOLS: Tool[] = [
  {
    id: 'nmap',
    name: 'Nmap',
    icon: '🔭',
    color: '#00d4ff',
    desc: 'Network port scanner — discovers open services and versions',
    endpoint: '/api/scan/nmap',
    targets: ['scanme.nmap.org'],
    targetLabel: 'Target Host',
    bodyKey: 'target',
  },
  {
    id: 'trivy',
    name: 'Trivy',
    icon: '🔬',
    color: '#00ff88',
    desc: 'Container image vulnerability scanner — finds CVEs in OS and app packages',
    endpoint: '/api/scan/trivy',
    targets: ['nginx:latest', 'python:3.9', 'node:18-alpine', 'ubuntu:20.04'],
    targetLabel: 'Docker Image',
    bodyKey: 'target',
  },
  {
    id: 'checkov',
    name: 'Checkov',
    icon: '📋',
    color: '#a855f7',
    desc: 'IaC security scanner — checks Terraform for CIS AWS Benchmark violations',
    endpoint: '/api/scan/checkov',
    targets: ['sample-misconfigured-tf'],
    targetLabel: 'IaC Template',
    bodyKey: 'hcl',
    customBody: true,
  },
];

const SAMPLE_MISCONFIGURED_TF = `
resource "aws_s3_bucket" "bad_bucket" {
  bucket = "my-public-bucket"
}

resource "aws_s3_bucket_acl" "bad_bucket_acl" {
  bucket = aws_s3_bucket.bad_bucket.id
  acl    = "public-read"
}

resource "aws_security_group" "bad_sg" {
  name = "allow-all"
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "bad_rds" {
  engine               = "mysql"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  publicly_accessible  = true
  storage_encrypted    = false
  username             = "admin"
  password             = "password123"
  identifier           = "my-database"
  skip_final_snapshot  = true
}
`.trim();

interface ScanLogEntry {
  type: 'status' | 'result' | 'error' | 'done';
  message: string;
  data?: any;
}

export default function ScannerPlayground() {
  const [selectedTool, setSelectedTool] = useState<Tool>(TOOLS[0]);
  const [selectedTarget, setSelectedTarget] = useState<string>(TOOLS[0].targets[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<ScanLogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const appendLog = (entry: ScanLogEntry) => {
    setLogs((prev) => [...prev, entry]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    setLogs([]);

    const body: Record<string, string> = {};
    if (selectedTool.customBody && selectedTool.id === 'checkov') {
      body.hcl = SAMPLE_MISCONFIGURED_TF;
    } else {
      body[selectedTool.bodyKey] = selectedTarget;
    }

    try {
      const res = await fetch(selectedTool.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.body) {
        appendLog({ type: 'error', message: 'No response stream from scan engine.' });
        setIsScanning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.tool) {
                appendLog({
                  type: 'result',
                  message: `Scan completed: ${data.findings?.length || 0} findings${
                    data.simulated ? ' (simulated)' : ''
                  }`,
                  data,
                });
              } else if (data.message) {
                appendLog({ type: 'status', message: data.message, data });
              }
            } catch {
              /* ignore non-JSON keepalive lines */
            }
          }
        }
      }
    } catch (e: any) {
      appendLog({ type: 'error', message: `Connection error: ${e.message}` });
    }

    setIsScanning(false);
  };

  const getLastResult = () => logs.find((l) => l.type === 'result')?.data;

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-primary)' }}>
      {/* Left: Tool cards */}
      <div
        style={{
          width: '300px',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          SELECT A SCANNER
        </div>

        {TOOLS.map((tool) => (
          <motion.div
            key={tool.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedTool(tool);
              setSelectedTarget(tool.targets[0]);
              setLogs([]);
            }}
            style={{
              background:
                selectedTool.id === tool.id ? `${tool.color}15` : 'var(--bg-card)',
              border: `1px solid ${
                selectedTool.id === tool.id ? tool.color : 'var(--border)'
              }`,
              borderRadius: '10px',
              padding: '1rem',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.4rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{tool.icon}</span>
              <span style={{ fontWeight: 700, color: tool.color, fontSize: '0.9rem' }}>
                {tool.name}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {tool.desc}
            </div>
          </motion.div>
        ))}

        {/* Target selector */}
        <div
          style={{
            marginTop: '0.5rem',
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
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
            {selectedTool.targetLabel.toUpperCase()}
          </div>
          {selectedTool.targets.map((t) => (
            <div
              key={t}
              onClick={() => setSelectedTarget(t)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
                background:
                  selectedTarget === t ? `${selectedTool.color}20` : 'transparent',
                border: `1px solid ${
                  selectedTarget === t ? selectedTool.color + '44' : 'transparent'
                }`,
                color: selectedTarget === t ? selectedTool.color : 'var(--text-muted)',
                fontSize: '0.78rem',
                marginBottom: '0.25rem',
                fontFamily: 'monospace',
              }}
            >
              {t}
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${selectedTool.color}44` }}
          whileTap={{ scale: 0.97 }}
          onClick={handleRunScan}
          disabled={isScanning}
          style={{
            background: isScanning
              ? 'rgba(100,116,139,0.3)'
              : `linear-gradient(135deg, ${selectedTool.color}, ${selectedTool.color}88)`,
            border: 'none',
            borderRadius: '8px',
            padding: '0.85rem',
            color: '#0a0e1a',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            marginTop: 'auto',
          }}
        >
          {isScanning ? '⏳ Running...' : `▶ Run ${selectedTool.name}`}
        </motion.button>
      </div>

      {/* Right: Terminal output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Terminal header */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'block' }} />
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {selectedTool.icon} {selectedTool.name} — {selectedTarget}
          </span>
          {isScanning && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: selectedTool.color,
                marginLeft: 'auto',
              }}
            />
          )}
        </div>

        {/* Log output */}
        <div
          style={{
            flex: 1,
            padding: '1.25rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            overflowY: 'auto',
            background: 'var(--bg-primary)',
          }}
        >
          {logs.length === 0 && !isScanning && (
            <div style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Select a scanner and click Run to start.
              <br />
              <span style={{ fontSize: '0.72rem' }}>
                Scans run on pre-approved safe targets only. Output is flagged as
                simulated when the tool binary is not installed in the host.
              </span>
            </div>
          )}

          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                color:
                  log.type === 'error'
                    ? 'var(--accent-red)'
                    : log.type === 'done'
                      ? 'var(--accent-green)'
                      : log.type === 'result'
                        ? 'var(--accent-cyan)'
                        : 'var(--text-muted)',
                marginBottom: '0.4rem',
                lineHeight: 1.5,
              }}
            >
              <span style={{ opacity: 0.5 }}>[{new Date().toLocaleTimeString()}] </span>
              {log.type === 'status' && '> '}
              {log.message}
            </motion.div>
          ))}

          {/* Findings display */}
          {(() => {
            const result = getLastResult();
            if (!result?.findings?.length) return null;
            return (
              <div style={{ marginTop: '1rem' }}>
                <div
                  style={{
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  ── FINDINGS ({result.findings.length})
                  {result.simulated ? ' — SIMULATED' : ''} ──────────────
                </div>
                {result.findings.slice(0, 30).map((f: any, i: number) => {
                  const sev = (f.severity || 'info').toLowerCase();
                  const isHot = sev === 'critical';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        background: isHot ? 'rgba(255,51,102,0.08)' : 'rgba(255,170,0,0.08)',
                        borderLeft: `3px solid ${isHot ? '#ff3366' : '#ffaa00'}`,
                        padding: '0.5rem 0.75rem',
                        marginBottom: '0.4rem',
                        borderRadius: '0 4px 4px 0',
                      }}
                    >
                      <span style={{ color: isHot ? '#ff3366' : '#ffaa00', fontWeight: 700 }}>
                        [{sev.toUpperCase()}]
                      </span>{' '}
                      <span style={{ color: 'var(--text-primary)' }}>{f.title}</span>
                      {f.detail && (
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.72rem',
                            marginTop: '0.2rem',
                          }}
                        >
                          {f.detail.slice(0, 160)}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}

          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
