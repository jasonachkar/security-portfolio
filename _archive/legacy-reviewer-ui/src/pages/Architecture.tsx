import { Boxes, Cloud, Lock, Server } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Badge, type BadgeTone } from '../components/shared/Badge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { ArchitectureNode } from '../components/shared/ArchitectureNode';
import { ProofLink } from '../components/shared/ProofLink';
import { LimitationCallout } from '../components/shared/LimitationCallout';
import {
  CLOUD_MODE,
  LOCAL_MODE,
  TRUST_ZONES,
  WHY_GATEWAY_PUBLIC,
  type ArchMode,
  type TrustZone,
} from '../data/architecture';

const ZONE_TONE: Record<TrustZone, BadgeTone> = TRUST_ZONES.reduce(
  (acc, zone) => ({ ...acc, [zone.zone]: zone.tone }),
  {} as Record<TrustZone, BadgeTone>,
);

const ZONE_LABEL: Record<TrustZone, string> = TRUST_ZONES.reduce(
  (acc, zone) => ({ ...acc, [zone.zone]: zone.label }),
  {} as Record<TrustZone, string>,
);

function RequestPath({ steps }: { steps: string[] }) {
  return (
    <div className="request-path" aria-label="Request path">
      {steps.map((step, index) => (
        <Fragment key={step}>
          <span className="request-path__node">{step}</span>
          {index < steps.length - 1 ? <span className="request-path__arrow" aria-hidden>→</span> : null}
        </Fragment>
      ))}
    </div>
  );
}

function ModeBlock({ mode, icon }: { mode: ArchMode; icon: ReactNode }) {
  const presentZones = TRUST_ZONES.filter((zone) => mode.nodes.some((node) => node.zone === zone.zone));

  return (
    <section className="surface-section mode-block">
      <SectionHeader eyebrow={mode.id === 'local' ? 'Mode 1' : 'Mode 2'} title={mode.title} description={mode.summary} icon={icon} />
      <RequestPath steps={mode.requestPath} />
      <div className="zone-stack">
        {presentZones.map((zone) => (
          <div className={`zone-group zone-group--${zone.tone}`} key={zone.zone}>
            <div className="zone-group__head">
              <Badge tone={zone.tone} uppercase>
                {zone.label}
              </Badge>
              <span className="zone-group__desc">{zone.description}</span>
            </div>
            <div className="zone-group__nodes">
              {mode.nodes
                .filter((node) => node.zone === zone.zone)
                .map((node) => (
                  <ArchitectureNode
                    key={node.name}
                    name={node.name}
                    role={node.role}
                    detail={node.detail}
                    tone={ZONE_TONE[node.zone]}
                    proof={node.proof}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
      {mode.inactiveZones?.map((inactive) => (
        <LimitationCallout key={inactive.zone} title={`${ZONE_LABEL[inactive.zone]} — disabled in this mode`}>
          {inactive.note}
        </LimitationCallout>
      ))}
      <div className="mode-block__foot">
        <ProofLink proof={mode.proof} />
      </div>
    </section>
  );
}

export function Architecture() {
  return (
    <div className="page-stack">
      <section className="surface-section">
        <SectionHeader
          eyebrow="Trust boundaries"
          title="Five zones, two deployment modes"
          description="The same services run two ways: a local full-tool lab where security tools actively run, and an Azure cloud-demo that proves the architecture with seeded data. Every node is colour-coded by trust zone."
          icon={<Boxes size={18} />}
        />
        <div className="legend">
          {TRUST_ZONES.map((zone) => (
            <div className="legend__item" key={zone.zone}>
              <Badge tone={zone.tone} uppercase>
                {zone.label}
              </Badge>
              <span className="legend__desc">{zone.description}</span>
            </div>
          ))}
        </div>
      </section>

      <ModeBlock mode={LOCAL_MODE} icon={<Server size={18} />} />
      <ModeBlock mode={CLOUD_MODE} icon={<Cloud size={18} />} />

      <section className="surface-section">
        <SectionHeader eyebrow="Design rationale" title="Why only the gateway is public" icon={<Lock size={18} />} />
        <p className="prose">{WHY_GATEWAY_PUBLIC}</p>
      </section>
    </div>
  );
}
