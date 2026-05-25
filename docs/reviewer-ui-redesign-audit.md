# Reviewer UI Redesign Audit

Scope: `apps/reviewer-ui` only. The backend services, monorepo layout, Docker Compose,
Terraform, and passing backend tests are intentionally out of scope. This audit captures the
state of the reviewer UI before the redesign and the plan to rebuild it as a serious
Cloud Security / DevSecOps portfolio case study.

Audit performed against branch `refactor/defensive-security-platform-lab`.

## 1. What Is Wrong With The Current UI

The implementation in `apps/reviewer-ui/src` is directionally on-message but reads as a rushed,
single-file brochure rather than an engineered case study.

- **One monolithic file.** `src/App.tsx` (~440 lines) holds every page, the layout, the nav,
  the tables, and the link component. There is no separation between layout, shared components,
  page content, and data.
- **No real routing.** Navigation is `useState<PageId>` with a `switch`. There is exactly one
  URL (`/`). A reviewer cannot deep-link to `/gateway` or `/evidence`, cannot bookmark a page,
  and browser back/forward does nothing. Playwright can only test by clicking buttons.
- **Proof links are fake.** `ClaimLink` renders a `<span>` with an external-link icon and the
  raw path text. Nothing is clickable. The single most important job of a portfolio reviewer
  UI — letting a senior engineer click straight to the proving code — is not done.
- **The data model is shallow.** `src/data.ts` is mostly arrays of string tuples
  (`['JWT/RBAC', 'apps/gateway/src/auth.ts']`). There is no notion of proof *type* (code vs test
  vs doc vs workflow vs evidence), no "what it proves", no limitation per item, and no structured
  architecture/telemetry/deployment data.
- **Content is thin and generic.** The gateway page lists control names with one fake link each
  and a four-row OWASP grid. The auth flow (login → access token → rotation → reuse detection)
  that is actually implemented and tested is never shown. The pages do not convey the depth that
  exists in the code.
- **Visual design is generic.** Flat cards, a single accent color, a static three-box "signal
  panel", and inline `ArrowRight` glyphs standing in for an architecture diagram. It does not
  read as comparable in seriousness to the SecureObs / Sentinel lab projects.
- **A risky eyebrow string.** The hero eyebrow reads `production-inspired`. While the current
  no-overclaiming test does not ban it, "production-inspired" is the kind of soft overclaim the
  redesign should drop in favor of precise, honest badges.

## 2. What Should Be Preserved

These are accurate and must survive the rebuild unchanged in spirit:

- **Project positioning:** "Defensive Security Platform Lab" — a controlled, defensive lab that
  complements SecureObs and the Sentinel detection lab.
- **The honest Real / Demo / Planned framing** from `README.md` and
  `docs/final-implementation-report.md`.
- **The five active services and their real responsibilities** (gateway, vulnerability-scanner,
  network-analyzer, assessment-orchestrator, reviewer-ui).
- **The safety model:** allowlisted targets only, local-lab active tooling by default, cloud-demo
  uses seeded data, only the gateway is publicly reachable, no exploitation, no arbitrary public
  scanning. Grounded in `docs/security/*` and `docs/architecture/local-vs-cloud.md`.
- **The no-overclaiming discipline** and its automated test (`scripts/no-overclaiming.test.mjs`),
  which should be *strengthened*, not weakened.
- **The build/test/screenshot pipeline** (`npm run build`, `npm test`, `npm run test:e2e`,
  `npm run evidence:screenshots`) and the evidence directory contract under `evidence/`.
- **Accurate README/docs** — updated only where the UI description changed.

## 3. What Should Be Replaced

- `src/App.tsx` monolith → an `AppShell` layout plus per-page modules under `src/pages`.
- `useState` page switching → React Router v7 routes (`react-router-dom@7.15.1`, already added).
- `ClaimLink` span → a real `ProofLink` anchor component with typed proof kinds and a GitHub base
  URL.
- `src/data.ts` tuples → typed, structured data modules under `src/data`.
- `src/styles.css` → a rebuilt design system under `src/styles/global.css` (tokens, spacing
  scale, responsive grids, architecture/timeline visuals, no horizontal overflow).
- The button-driven Playwright spec and the click-driven screenshot generator → route-driven
  versions that exercise real URLs and the new page set.

## 4. Pages, Components, And Data Models Needed

### Routes / pages
| Route | Page component | Purpose |
| --- | --- | --- |
| `/` | `StartHere` | 60-second orientation: mission, badges, what it proves, 5-min path, architecture preview, Real/Demo/Planned, limitations. |
| `/architecture` | `Architecture` | Local Full-Tool Lab vs Azure Cloud-Demo, with trust boundaries. |
| `/gateway` | `SecureGateway` | Auth flow, security controls, OWASP API Top 10 mapping, tests, tradeoffs. |
| `/assessment-pipeline` | `AssessmentPipeline` | Defensive assessment lifecycle, scanner + orchestrator stories, guardrails. |
| `/network-telemetry` | `NetworkTelemetry` | Capture vs demo modes, flow model, anomaly example, caveats. |
| `/azure-deployment` | `AzureDeployment` | Cloud-demo goal, Azure resources, security architecture, CI/CD, placeholders. |
| `/evidence` | `Evidence` | Verified evidence first, evidence cards, samples, missing-Azure-evidence last. |
| `/sandbox` | `LabSandbox` | Optional, clearly secondary API exploration surface. |

### Components
- Layout: `AppShell`, `Sidebar`, `Topbar`.
- Shared: `Badge`, `ProofLink`, `ProofCard`, `SectionHeader`, `StatusTable`, `MetricCard`,
  `ArchitectureNode`, `Timeline`, `EvidenceCard`, `LimitationCallout`.

### Data modules (typed)
- `projectFacts.ts` — name, mission, badges, "what this proves", 5-min path, Real/Demo/Planned.
- `evidenceCatalog.ts` — evidence items with `title`, `status`, `proofType`, `proof`,
  `proves`, `limitation`.
- `architecture.ts` — local + cloud nodes, edges, and trust boundaries.
- `gatewayControls.ts` — controls with proof, auth-flow steps, OWASP API Top 10 mapping.
- `assessmentPipeline.ts` — lifecycle stages, scanner story, orchestrator story, guardrails.
- `networkTelemetry.ts` — telemetry modes, flow fields, anomaly example, caveats.
- `azureDeployment.ts` — resources, security points, CI/CD steps, evidence placeholders.
- `limitations.ts` — shared, honest limitation statements + "claims I do / don't make".

## 5. How The New UI Will Prove The Platform Clearly

- **Every strong claim links to its proof.** `ProofLink` resolves repo-relative paths to
  `https://github.com/jasonachkar/security-portfolio/blob/refactor/defensive-security-platform-lab/<path>`
  and tags each link with its kind (code / test / workflow / doc / evidence / screenshot).
  Verified backend paths used as proof include `apps/gateway/src/auth.ts`,
  `apps/gateway/src/proxy.ts`, `apps/gateway/test/gateway.test.ts`,
  `apps/vulnerability-scanner/src/.../infra/security/target_validation.py`,
  `apps/assessment-orchestrator/src/.../services/runners.py`,
  `apps/network-analyzer/src/.../services/capture.py`, `infra/local/docker-compose.yml`, and
  `infra/azure/terraform/environments/dev/main.tf`.
- **The gateway page shows the real, tested auth model**: login → access token (15 min) →
  rotating refresh family → reuse detection → family revocation → logout, each tied to the
  matching `it(...)` case in `gateway.test.ts` (10 tests).
- **The assessment page shows the real safety model**: `validate_target_url` /
  `validate_target` allowlist enforcement, `build_nmap_command` with no shell interpolation,
  subprocess timeouts, and `demo/import` seeding for cloud-demo.
- **The network page shows the real flow model and the 5 MB / 10 s demo spike threshold** from
  `capture.py`, honest about Docker capture limitations.
- **The Azure page shows why only the gateway is external** (`external_enabled = true` on the
  gateway module, `false` on the internal services in `main.tf`) and `CLOUD_DEMO_MODE = "true"`.
- **The evidence page leads with verified artifacts** (10 gateway tests, 6 scanner, 4 network,
  6 orchestrator, compose config, terraform validate, gitleaks, UI tests/screenshots) and puts
  not-yet-captured Azure portal screenshots at the bottom.

## 6. What Claims Must Stay Honest

These must remain true and visible; they are enforced by the strengthened no-overclaiming test:

- Not a production SOC and not a real-time SOC.
- Not production-ready and not an enterprise-grade product.
- Not compliance-certified (not SOC 2 compliant, not ISO 27001 certified).
- Not an exploitation/exploit framework; no autonomous exploitation.
- Not a scanner for arbitrary public / internet targets.
- Active ZAP/Nmap/tshark/Trivy execution is local-lab and allowlisted by default.
- Cloud-demo mode uses seeded/sample data; Azure portal screenshots are placeholders until a real
  deploy is captured and redacted.

The test allows negated forms ("not production-ready", "not a production SOC",
"not compliance-certified") so the UI can state its boundaries plainly.

## 7. Final Implementation Plan

1. **Routing (Phase 2).** Add `react-router-dom` (done: 7.15.1). `BrowserRouter` + `Routes`,
   `NavLink` sidebar, real URLs, browser history. Add SPA fallback for the nginx container
   (`apps/reviewer-ui/nginx.conf`) and `public/staticwebapp.config.json` for Azure SWA so
   deep links work.
2. **Structure (Phase 3).** Create `src/app`, `src/components/{layout,shared}`, `src/data`,
   `src/pages`, `src/styles`. Remove the monolith.
3. **ProofLink (Phase 4).** Real anchors, GitHub base URL, local/doc/evidence path handling,
   external links open in a new tab with `rel="noreferrer"`, safe wrapping, kind badges.
4. **Pages (Phases 5–12).** Rebuild all eight pages from the typed data modules.
5. **Design polish (Phase 13).** Dark security design system, tokens, responsive grids,
   architecture and timeline visuals, no body horizontal overflow.
6. **Tests + screenshots (Phase 14).** Route-driven Playwright specs across the page set,
   strengthened negation-aware no-overclaiming test, layout/overflow tests at
   mobile/laptop/desktop, route-driven screenshot generator producing the new filenames
   (including `mobile-start-here.png`).
7. **Docs (Phase 15).** Update `README.md`, `docs/final-implementation-report.md`,
   `docs/evidence/evidence-guide.md`; add `docs/reviewer-ui-redesign-report.md`.
8. **Validation.** `npm ci && npm run build && npm test && npm run test:e2e &&
   npm run evidence:screenshots`, without weakening tests or removing honest limitations.
