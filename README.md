# sambit-portfolio

Interactive backend-systems portfolio. The playground at `/play` is a working simulator —
seven guided missions (load balancing, Docker, VPC, Redis, WebSockets, payments/webhooks,
RabbitMQ) plus a SQL console over an in-memory database, rendered as a CSS-3D scene on
React Flow with GSAP animation.

## Develop

```bash
npm install
npm run dev
```

Checks:

```bash
npx eslint .
npx tsc --noEmit
npx tsx src/lib/sim/engine.selfcheck.ts
npx tsx src/lib/sim/sql.selfcheck.ts
npm run build
```

## Deploy (Vercel)

Two paths — pick one:

**A. Vercel git integration (simplest).** Push this repo to GitHub, then
[import it on Vercel](https://vercel.com/new). Every push to `main` deploys to production,
every PR gets a preview URL. The GitHub Actions workflow still runs CI on each push.

**B. GitHub Actions pipeline** (`.github/workflows/deploy.yml`). CI (lint, types,
self-checks, build) runs on every push/PR; pushes to `main` that pass CI deploy to Vercel.
Requires three repository secrets (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
| --- | --- |
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | run `npx vercel link` once locally, then read `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | same `.vercel/project.json` |

If you use path B together with the git integration, turn off Vercel's own auto-deploy
for the repo (Project → Settings → Git) so it doesn't double-deploy.

## Resume PDF

`public/resume.pdf` is compiled from `resume/sambit-ghosh-resume.tex`:

```bash
tectonic resume/sambit-ghosh-resume.tex && cp resume/sambit-ghosh-resume.pdf public/resume.pdf
```
