# Deployment

The portfolio is two apps:

- **`apps/reviewer-ui`** — Vite + React 19 single-page app (the frontend).
- **`apps/scan-engine`** — Express + TypeScript API (threat intel, infra
  validation, scanner execution over SSE).

## Local development

```bash
# Terminal 1 — API
cd apps/scan-engine
npm install
npm run dev            # http://localhost:4000

# Terminal 2 — UI (proxies /api -> localhost:4000, see vite.config.ts)
cd apps/reviewer-ui
npm install --legacy-peer-deps   # react-simple-maps peer-pins React <=18
npm run dev            # http://localhost:5173
```

Or run both in containers (the scan-engine image bundles nmap/trivy/checkov):

```bash
docker compose -f docker-compose.dev.yml up --build
```

## Vercel

`vercel.json` builds the UI as a static site and the scan-engine as a Node
serverless function, routing `/api/*` to the function and everything else to the
SPA.

```bash
npm i -g vercel
vercel           # preview
vercel --prod    # production
```

### Important serverless caveat

Vercel serverless functions **cannot execute `nmap` / `trivy` / `checkov`**
(no binaries, restricted runtime). On Vercel the scanner routes therefore return
the **clearly-flagged simulated output** (`"simulated": true`). The threat-intel
(`/api/threats/*`) and infra-validation (`/api/infra/*`) routes work fully in
serverless. To run the real scanners, host the scan-engine container (e.g. on a
VM / Fly.io / Render) where the binaries are installed — see the scan-engine
`Dockerfile`.

## Honesty / no-overclaiming

The UI ships with a guard test (`apps/reviewer-ui/scripts/no-overclaiming.test.mjs`)
that fails the build if marketing-style overclaims slip into the source. Keep
copy factual: scanner output is labelled simulated when a binary is absent, and
threat feeds are labelled as sample data when the live API is unreachable.
