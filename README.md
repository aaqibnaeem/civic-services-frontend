# Civic Frontend

React SPA for **AI Smart Civic Services** — citizens report civic issues in plain
language, an AI pipeline categorises and prioritises them, and staff triage them
from an admin console with a full statistics dashboard.

Built against the frozen API contract in [`../docs/CONTRACT.md`](../docs/CONTRACT.md).

---

## Stack

| Concern | Choice |
|---|---|
| Build | Vite 8 + React 19 + TypeScript 6 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) via `@tailwindcss/vite` |
| Components | shadcn/ui (`radix-nova` preset, Radix primitives, Lucide icons) |
| Server state | TanStack Query v5 |
| Client state | Zustand 5 with `persist` → localStorage |
| Routing | React Router DOM v7 (data router, lazy routes) |
| Forms | react-hook-form + zod 4 (`@hookform/resolvers`) |
| Charts | Recharts 3 via the shadcn `chart` wrapper |
| Toasts | sonner |
| Dates | date-fns 4 |

Package manager: **npm**.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` → `http://localhost:8000`, so start the FastAPI
backend separately and everything just works — no CORS configuration, no env file.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 with the `/api` proxy |
| `npm run build` | `tsc -b` then `vite build` → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm run lint` | oxlint |
| `npm run gen:types` | Generate `src/lib/api/schema.gen.ts` from the live OpenAPI schema (backend must be running) |

`gen:types` runs `openapi-typescript` through `npx` on purpose — its published
peer range is `typescript@^5`, which conflicts with the TypeScript 6 this project
uses. Running it out-of-tree keeps `npm install` clean. The generated file is
gitignored; the hand-written `src/lib/api/types.ts` remains the source of truth.

---

## Environment variables

Copy `.env.example` → `.env.local`. Only `VITE_`-prefixed variables reach the
browser — never put a secret in one.

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `/api/v1` | Base URL **including** the version segment. Leave unset in dev to use the proxy. In production set it to the deployed API, e.g. `https://civic-api.onrender.com/api/v1`. |

`GET /health` lives at the API root rather than under `/api/v1`; the client
derives that URL automatically by stripping the version segment.

---

## Project layout

```
src/
  components/        shared, domain-aware components (badges, states, StatCard…)
    ui/              shadcn primitives — generated, edit sparingly
  hooks/             one module per API area; import from '@/hooks'
  layouts/           PublicLayout (header/footer) · AdminLayout (sidebar/topbar)
  lib/
    api/             client.ts · types.ts · endpoints.ts · queryKeys.ts
    domain.ts        enum → label / colour / icon (single source of truth)
    query-client.ts  QueryClient defaults
    utils.ts         cn()
  pages/             one file per route, default-exported
    admin/
  routes/            router table, ProtectedRoute, error boundary
  stores/            authStore · draftStore · trackedStore · uiStore
  index.css          the whole design system (Tailwind v4 @theme)
```

---

## Design system

Everything lives in `src/index.css` as Tailwind v4 theme tokens, with a full
light **and** dark palette:

- shadcn surface tokens (`--background`, `--card`, `--primary`, …) on a civic
  navy primary
- **7 category** colours: `--color-cat-{road,water,waste,electricity,drainage,safety,other}`
- **4 priority** colours on an escalating ramp: `--color-prio-{low,medium,high,critical}`
- **5 status** colours: `--color-status-{open,assigned,in-progress,resolved,rejected}`
- **3 AI tier** colours: `--color-ai-{llm,ml,rules}`
- 8 chart slots: `--chart-1` … `--chart-8`

Each domain token has a matching `-fg` variant tuned for legibility on its own
tinted chip, in both themes. Never write these class names by hand — read them
from `src/lib/domain.ts`, or use the badge components.

Dark mode is class-based (`<html class="dark">`), driven by `uiStore` and
pre-painted by an inline script in `index.html` so there is no flash.

---

## Deploying to Vercel

1. Push this folder to a Git repo (or use the repo root and set **Root
   Directory** to `civic-frontend`).
2. Import the project on Vercel. It auto-detects Vite:
   - Build command `npm run build`
   - Output directory `dist`
   - Install command `npm install`
3. Add the environment variable **`VITE_API_URL`** = your deployed API base URL
   including `/api/v1`, for Production (and Preview if you want).
4. Deploy. `vercel.json` already contains the SPA rewrite so deep links such as
   `/track/CIV-8F3K2M` resolve to `index.html` instead of 404ing.

Remember to add the Vercel origin to the backend's CORS allowlist — the contract
requires the Vercel origin plus `http://localhost:5173`.

CLI alternative:

```bash
npx vercel --cwd civic-frontend
npx vercel --cwd civic-frontend --prod
```

---

## Demo credentials

`admin@civic.gov.pk` / `Admin@123` (role `admin`) — seeded by the backend. The
login page has a one-click fill button for them.
