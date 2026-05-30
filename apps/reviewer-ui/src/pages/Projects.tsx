import { motion } from 'framer-motion';
import { Github, Shield, Eye, Server } from 'lucide-react';

const PROJECTS = [
  {
    id: 'security-portfolio',
    name: 'Security Portfolio Platform',
    tagline:
      'This site — interactive cloud security lab with scanner execution and live threat data',
    description:
      'Full-stack cloud security portfolio featuring a CVE feed, an interactive infra designer with real misconfiguration detection, scanner execution (Nmap, Trivy, Checkov) over SSE, and a global threat map powered by the NVD and GreyNoise APIs. Scanner output is clearly flagged when simulated.',
    tech: [
      'React 19',
      'React Flow',
      'TypeScript',
      'Node.js',
      'Trivy',
      'Checkov',
      'Nmap',
      'NVD API',
      'GreyNoise',
      'Vercel',
    ],
    github: 'https://github.com/jasonachkar/security-portfolio',
    color: '#00d4ff',
    icon: Shield,
    proofs: [
      'Cloud security posture management (CSPM) concepts',
      'IaC misconfiguration scanning with Checkov',
      'Container vulnerability scanning with Trivy',
      'Threat intelligence API integration',
      'CIS AWS Benchmark and NIST 800-53 controls',
    ],
  },
  {
    id: 'secureobs',
    name: 'SecureObs',
    tagline:
      'Security observability platform — threat detection and monitoring',
    description:
      'A production-grade security observability project with log ingestion, anomaly detection, alert management, and a responsive Angular dashboard. Demonstrates SOC-style tooling built from scratch.',
    tech: ['Angular', 'TypeScript', 'Node.js', 'Docker', 'SQL Server', 'REST APIs'],
    github: 'https://github.com/jasonachkar/secureobs',
    color: '#00ff88',
    icon: Eye,
    proofs: [
      'Security observability and SIEM concepts',
      'Event processing pipeline design',
      'Incident response workflow design',
      'Production-grade Angular architecture',
      'DevSecOps CI/CD pipeline design',
    ],
  },
  {
    id: 'infra',
    name: 'Cloud Infrastructure Lab',
    tagline: 'Personal homelab — Azure + Docker security testing environment',
    description:
      'A personal cloud security testing environment combining Azure services, Docker containers, and custom tooling. Used for hands-on CEH exam preparation and practical security experimentation.',
    tech: ['Azure', 'Docker', 'Terraform', 'Linux', 'Python', 'Bash'],
    github: 'https://github.com/jasonachkar',
    color: '#a855f7',
    icon: Server,
    proofs: [
      'Azure cloud architecture and security controls',
      'Infrastructure as Code with Terraform',
      'Container security and hardening',
      'Network segmentation and VPC design',
      'Hands-on defensive testing concepts',
    ],
  },
];

export default function Projects() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        padding: '80px 2rem 3rem',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '3rem', textAlign: 'center' }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 900,
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.75rem',
            }}
          >
            Projects &amp; Code
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            Every project here is real code. Click any GitHub link to read the source.
          </p>
        </motion.div>

        {/* Project cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {PROJECTS.map((project, i) => {
            const Icon = project.icon;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${project.color}33`,
                  borderLeft: `4px solid ${project.color}`,
                  borderRadius: '12px',
                  padding: '1.75rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '1.5rem',
                  alignItems: 'start',
                }}
              >
                <div>
                  {/* Title */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <Icon size={20} color={project.color} />
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {project.name}
                    </h2>
                  </div>
                  <p
                    style={{
                      color: project.color,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {project.tagline}
                  </p>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.83rem',
                      lineHeight: 1.6,
                      marginBottom: '1rem',
                    }}
                  >
                    {project.description}
                  </p>

                  {/* What this proves */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        marginBottom: '0.5rem',
                      }}
                    >
                      WHAT THIS PROVES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {project.proofs.map((proof, j) => (
                        <div
                          key={j}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <span style={{ color: project.color, fontWeight: 700 }}>✓</span>
                          {proof}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tech stack */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        style={{
                          background: `${project.color}11`,
                          border: `1px solid ${project.color}33`,
                          borderRadius: '4px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.68rem',
                          color: project.color,
                          fontWeight: 600,
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    minWidth: '120px',
                  }}
                >
                  <motion.a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: `${project.color}15`,
                      border: `1px solid ${project.color}44`,
                      borderRadius: '6px',
                      padding: '0.6rem 1rem',
                      color: project.color,
                      textDecoration: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    <Github size={14} /> View Code
                  </motion.a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
