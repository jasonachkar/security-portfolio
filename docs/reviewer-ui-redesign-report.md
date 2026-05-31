# Reviewer UI Redesign Report

Scope: `apps/reviewer-ui` only. No backend service code, monorepo structure, Docker Compose
service topology, Terraform, or backend tests were changed. The audit that preceded this work is
`docs/reviewer-ui-redesign-audit.md`.

## 1. What Was Wrong With The Old UI

- A single `src/App.tsx` (~440 lines) held every page, the layout, the navigation, the tables, and
  the link component.
- Navigation was `useState`-based page switching, so the app had exactly one URL. Reviewers could
  not deep-link to `/architecture`, `/gateway`, etc.; browser back/forward did nothing.
- `ClaimLink` rendered a `<span>` — proof "links" were not clickable.
- `src/data.ts` was shallow arrays of string tuples with no proof types, no "what it proves", and
  no structured architecture/telemetry/deployment data.
- Pages were thin and generic; the implemented, tested auth model and safety controls were not
  visible. The visual design did not read as a serious cloud/security case study.

## 2. What Was Rebuilt

- **Real routing.** Added `react-router-dom@7.15.1`. `BrowserRouter` + `Routes` with a shared
  `AppShell` layout route, `NavLink` sidebar, real URLs, working back/forward, and scroll reset on
  navigation. Added SPA fallback for both hosting targets: `apps/reviewer-ui/nginx.conf`
  (container) and `apps/reviewer-ui/public/staticwebapp.config.json` (Azure Static Web Apps).
- **Real proof links.** New `ProofLink` renders an `<a>` to
  `https://github.com/jasonachkar/security-portfolio/blob/refactor/defensive-security-platform-lab/<path>`,
  opens external links in a new tab (`rel="noreferrer"`), wraps long paths safely, and tags each
  link with its kind (code / test / workflow / doc / evidence / screenshot).
- **Structured, typed data.** Replaced the tuple file with eight typed data modules.
- **A real design system.** Token-driven dark security theme under `src/styles/global.css` with a
  responsive shell, architecture and timeline visuals, readable tables, and no body horizontal
  overflow.

## 3. Pages Added (`src/pages`)

| Route | Page |
| --- | --- |
| `/` | `StartHere` — hero, honest badges, "what this proves", 5-minute path, architecture preview, Real/Demo/Planned, limitations. |
| `/architecture` | `Architecture` — local full-tool lab vs Azure cloud-demo, five trust zones, "why only the gateway is public". |
| `/gateway` | `SecureGateway` — auth-flow timeline, security controls, OWASP API Top 10 mapping, tests, hardening tradeoffs. |
| `/assessment-pipeline` | `AssessmentPipeline` — lifecycle, scanner + orchestrator stories, guardrails. |
| `/network-telemetry` | `NetworkTelemetry` — telemetry modes, flow model, anomaly vs baseline, capture caveats. |
| `/azure-deployment` | `AzureDeployment` — resources, security architecture, CI/CD (automated vs manual), placeholders. |
| `/evidence` | `Evidence` — verified evidence first, samples, claims made/not made, Azure-to-capture last. |
| `/sandbox` | `LabSandbox` — optional, demo-by-default API exploration. |

## 4. Components Added

- Layout (`src/components/layout`): `AppShell`, `Sidebar`, `Topbar`.
- Shared (`src/components/shared`): `Badge`, `ProofLink`, `ProofCard`, `SectionHeader`,
  `StatusTable`, `MetricCard`, `ArchitectureNode`, `Timeline`, `EvidenceCard`, `LimitationCallout`.

## 5. Data Model Added (`src/data`)

`projectFacts.ts`, `evidenceCatalog.ts`, `architecture.ts`, `gatewayControls.ts`,
`assessmentPipeline.ts`, `networkTelemetry.ts`, `azureDeployment.ts`, `limitations.ts`. Every proof
path was verified against the repository (gateway TypeScript, the three FastAPI services, Terraform,
workflows, and evidence samples).

## 6. Tests Added / Updated

- `tests/reviewer-path.spec.ts` (route-driven Playwright, chromium + Pixel 5):
  deep-link rendering for all seven primary routes, sidebar navigation + back/forward, a real
  GitHub-anchor proof-link assertion, honest-language visibility, and a no-body-horizontal-overflow
  check across mobile (375), laptop (1366), and desktop (1920).
- `scripts/no-overclaiming.test.mjs`: strengthened to a negation-aware scan. Banned phrases include
  unsafe marketing, operational, compliance, and offensive-security wording
  across the visible UI. A self-test guards the detector from
  public/internet targets — each allowed only in negated form. A self-test guards the detector from
  silently becoming a no-op.
- `playwright.config.ts`: runs a dedicated fresh Vite server on its own port
  (`reuseExistingServer: false`) so e2e never reuses the local Docker lab on `:5173`.

## 7. Screenshots Generated

`scripts/generate-screenshots.ts` is now route-driven and writes to `evidence/screenshots/`:
`start-here.png`, `architecture.png`, `gateway.png`, `assessment-pipeline.png`,
`network-telemetry.png`, `azure-deployment.png`, `evidence.png`, and `mobile-start-here.png`. The
stale old-named captures (`start.png`, `pipeline.png`, `network.png`, `azure.png`) were removed.

## 8. Remaining Limitations

- The UI shows demo/sample data and labelled placeholders; it does not call live services unless a
  local lab or cloud-demo gateway is configured via `VITE_API_BASE_URL`.
- Layout tests assert structure and overflow, not pixel-level visual regression.
- Azure portal screenshots remain to be captured from a real deploy and redacted per
  `docs/evidence/evidence-guide.md`.
- The no-overclaiming guard is phrase-based with a negation window, not a semantic review.

## 9. Final Showcase Recommendation

Lead a review at `/` (Start Here), then `/architecture` to establish the trust model, then
`/gateway` for the strongest, most-tested engineering, then `/assessment-pipeline` for the defensive
safety model, and close on `/evidence`. Every strong claim is one click from the code, test, or
evidence that backs it, and the boundaries are stated plainly — which is what makes the case study
credible to a senior engineer.
