import { Camera, CheckCircle2, FileCheck2, FileJson, XCircle } from 'lucide-react';
import { SectionHeader } from '../components/shared/SectionHeader';
import { EvidenceCard } from '../components/shared/EvidenceCard';
import { MetricCard } from '../components/shared/MetricCard';
import { ProofLink } from '../components/shared/ProofLink';
import {
  API_SAMPLES,
  AZURE_TO_CAPTURE,
  EVIDENCE_TEST_TOTALS,
  SCREENSHOTS,
  VERIFIED_EVIDENCE,
} from '../data/evidenceCatalog';
import { CLAIMS_MADE, CLAIMS_NOT_MADE } from '../data/limitations';

export function Evidence() {
  return (
    <div className="page-stack">
      <section className="surface-section">
        <SectionHeader
          eyebrow="Verified first"
          title="Evidence you can click through to"
          description="This page leads with what is proven and tested. Evidence that still needs to be captured sits at the very bottom."
          icon={<FileCheck2 size={18} />}
        />
        <div className="metric-grid metric-grid--row">
          <MetricCard value={EVIDENCE_TEST_TOTALS.gateway} label="Gateway tests" tone="green" />
          <MetricCard value={EVIDENCE_TEST_TOTALS.scanner} label="Scanner tests" tone="teal" />
          <MetricCard value={EVIDENCE_TEST_TOTALS.network} label="Network tests" tone="indigo" />
          <MetricCard value={EVIDENCE_TEST_TOTALS.orchestrator} label="Orchestrator tests" tone="violet" />
          <MetricCard value={EVIDENCE_TEST_TOTALS.backendTotal} label="Backend total" hint="all passing" tone="green" />
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Verified evidence" title="Tests, validation, and scans" icon={<CheckCircle2 size={18} />} />
        <div className="grid grid--2">
          {VERIFIED_EVIDENCE.map((item) => (
            <EvidenceCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="Generated screenshots"
          title="Reviewer UI captures"
          description="Produced by npm run evidence:screenshots and committed under evidence/screenshots."
          icon={<Camera size={18} />}
        />
        <div className="grid grid--4">
          {SCREENSHOTS.map((shot) => (
            <div className="link-card" key={shot.title}>
              <span className="link-card__title">{shot.title}</span>
              <ProofLink proof={shot.proof} compact />
            </div>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader
          eyebrow="API samples"
          title="Sample API outputs"
          description="Demo payloads are labelled demo: true so they are never mistaken for live data."
          icon={<FileJson size={18} />}
        />
        <div className="grid grid--2">
          {API_SAMPLES.map((sample) => (
            <div className="link-card" key={sample.title}>
              <span className="link-card__title">{sample.title}</span>
              <span className="link-card__note">{sample.note}</span>
              <ProofLink proof={sample.proof} compact />
            </div>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <SectionHeader eyebrow="Interview-ready" title="Claims I make — and claims I do not" icon={<FileCheck2 size={18} />} />
        <div className="claims-grid">
          <div className="claims-col claims-col--yes">
            <h3>
              <CheckCircle2 size={16} aria-hidden /> Claims I can safely make
            </h3>
            <ul>
              {CLAIMS_MADE.map((claim) => (
                <li key={claim}>{claim}</li>
              ))}
            </ul>
          </div>
          <div className="claims-col claims-col--no">
            <h3>
              <XCircle size={16} aria-hidden /> Claims I do not make
            </h3>
            <ul>
              {CLAIMS_NOT_MADE.map((claim) => (
                <li key={claim}>{claim}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="surface-section surface-section--muted">
        <SectionHeader eyebrow="Still to capture" title="Azure evidence not yet collected" icon={<Camera size={18} />} />
        <div className="grid grid--2">
          {AZURE_TO_CAPTURE.map((item) => (
            <EvidenceCard key={item.title} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
