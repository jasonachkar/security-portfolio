import { motion } from 'framer-motion';
import { Shield, MapPin, GraduationCap, ExternalLink } from 'lucide-react';

const CERTS = [
  { name: 'CompTIA Security+', status: 'active', icon: '✅' },
  { name: 'CEH — Certified Ethical Hacker', status: 'in-progress', icon: '⏳' },
  { name: 'MSc Cybersecurity — University of London', status: 'active', icon: '🎓' },
];

const SKILLS = [
  {
    category: 'Cloud Security',
    items: [
      'AWS Security',
      'Azure Security',
      'IAM & Least Privilege',
      'VPC & Network Segmentation',
      'CSPM',
      'Security Groups & NACLs',
    ],
  },
  {
    category: 'DevSecOps',
    items: [
      'CI/CD Pipeline Security',
      'Container Security',
      'IaC Scanning (Checkov)',
      'SAST (Semgrep)',
      'Docker Hardening',
      'Terraform',
    ],
  },
  {
    category: 'Threat & Vuln',
    items: [
      'Nmap / Nessus',
      'Trivy',
      'Nuclei',
      'CVSS Scoring',
      'CVE Analysis',
      'Threat Intelligence',
    ],
  },
  {
    category: 'Frameworks',
    items: [
      'CIS AWS Benchmark',
      'NIST 800-53',
      'OWASP Top 10',
      'MITRE ATT&CK',
      'ISO 27001 Basics',
    ],
  },
  {
    category: 'Engineering',
    items: [
      'TypeScript / Node.js',
      'React',
      'SQL / Databases',
      'Linux / Bash',
      'Python',
      'REST APIs',
    ],
  },
];

export default function About() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        padding: '80px 2rem 3rem',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left — Identity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: '#0a0e1a',
                }}
              >
                JA
              </div>
              <div>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Jason Achkar Diab
                </h1>
                <p style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  Targeting: Cloud Security Engineer / DevSecOps
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <MapPin size={14} color="var(--accent-cyan)" />
                Montréal, Québec, Canada
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Shield size={14} color="var(--accent-green)" />
                Background: Full-Stack Dev → DevOps → Cloud Security
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <GraduationCap size={14} color="var(--accent-purple)" />
                MSc Cybersecurity — University of London
              </div>
            </div>

            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                lineHeight: 1.7,
                marginBottom: '1.5rem',
              }}
            >
              Full-stack software engineer moving into cloud security. I build
              security tooling rather than just talk about it — this platform runs
              scanners, pulls threat intel, and validates cloud architectures.
              Looking for a cloud security engineering or DevSecOps role where I can
              apply both engineering and security depth.
            </p>

            {/* Certs */}
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  marginBottom: '0.75rem',
                }}
              >
                CERTIFICATIONS &amp; EDUCATION
              </div>
              {CERTS.map((cert) => (
                <div
                  key={cert.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{cert.icon}</span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color:
                        cert.status === 'in-progress'
                          ? 'var(--text-muted)'
                          : 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {cert.name}
                  </span>
                  {cert.status === 'in-progress' && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: '#ffaa00',
                        background: 'rgba(255,170,0,0.1)',
                        border: '1px solid rgba(255,170,0,0.3)',
                        borderRadius: '3px',
                        padding: '0.1rem 0.35rem',
                        marginLeft: 'auto',
                      }}
                    >
                      In Progress
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Skills */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {SKILLS.map((group, i) => (
              <motion.div
                key={group.category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    marginBottom: '0.6rem',
                  }}
                >
                  {group.category.toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {group.items.map((item) => (
                    <span
                      key={item}
                      style={{
                        background: 'rgba(0,212,255,0.06)',
                        border: '1px solid rgba(0,212,255,0.15)',
                        borderRadius: '4px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* GitHub CTA */}
            <motion.a
              href="https://github.com/jasonachkar"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,212,255,0.2)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background:
                  'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,255,136,0.15))',
                border: '1px solid var(--accent-cyan)',
                borderRadius: '10px',
                padding: '1rem',
                color: 'var(--accent-cyan)',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <ExternalLink size={16} />
              View All Code on GitHub
            </motion.a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
