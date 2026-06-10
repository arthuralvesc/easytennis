# CLAUDE.md — Frontend (`frontend/`)

This file provides frontend-specific guidance to Claude Code (claude.ai/code).

> **Project-wide rules live in the root [`../CLAUDE.md`](../CLAUDE.md):** the
> application's business rules, the mandatory Development Protocol (including the
> "never declare a task finished without running every step" rule), and the
> GitHub workflow. Always follow those in addition to the frontend specifics below.

## Project Structure

This is a tennis app (easytennis) with a single `frontend/` directory containing a Next.js 16 application.

## Commands (run from `frontend/`)

```bash
npm run dev      # Start dev server (Turbopack, outputs to .next/dev)
npm run build    # Production build (Turbopack by default)
npm run start    # Start production server
eslint .         # Lint (next lint is removed in v16 — use ESLint directly)
npx next typegen # Generate type helpers for PageProps, LayoutProps, RouteContext
```

## This is Next.js 16 — Breaking Changes vs. Training Data

The app uses **Next.js 16.2.6** and **React 19.2.4**. Many APIs differ from Next.js 13–15. **Read `node_modules/next/dist/docs/` before writing any code.** Key differences:

### Async-only Request APIs (breaking)
`cookies()`, `headers()`, `draftMode()`, route `params`, and page `searchParams` are now **fully async** — synchronous access is removed. Always `await` them:

```tsx
// page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  const query = await props.searchParams
}
```

Run `npx next typegen` to generate `PageProps<'/path/[param]'>`, `LayoutProps`, and `RouteContext` type helpers.

### Proxy instead of Middleware
The `middleware.ts` file is renamed to `proxy.ts`. Export `proxy` instead of `middleware`. The edge runtime is **not** supported in proxy — it uses Node.js only. Config flags also changed: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

### `next lint` is removed
`next build` no longer runs linting. Run `eslint` directly (already configured in `eslint.config.mjs` with flat config format).

### Turbopack is default
Both `next dev` and `next build` use Turbopack. To opt out: `next build --webpack`. Dev output goes to `.next/dev/`, not `.next/`.

### Caching APIs
- `revalidateTag('tag')` now **requires** a second `cacheLife` argument: `revalidateTag('tag', 'max')`
- New `updateTag('tag')` for immediate cache expiry (read-your-writes in Server Actions)
- New `refresh()` to refresh the client router from a Server Action
- `cacheLife` and `cacheTag` are stable — drop the `unstable_` prefix
- PPR/cache components: use `cacheComponents: true` in `next.config.ts` (replaces `experimental.ppr` and `experimental.dynamicIO`)

### Parallel Routes require `default.js`
All `@slot` folders must have an explicit `default.js` file or builds fail.

### Removed APIs
- `serverRuntimeConfig` / `publicRuntimeConfig` — use `process.env` and `NEXT_PUBLIC_` prefix
- `next/legacy/image` — use `next/image`
- `images.domains` — use `images.remotePatterns`
- AMP support entirely removed
- `devIndicators.appIsrStatus`, `buildActivity`, `buildActivityPosition` options

### Instant Navigations (with `cacheComponents`)
When using `cacheComponents: true`, Suspense boundaries must be placed at the page level (not only in the root layout) for instant client navigations. Export `unstable_instant` from routes to validate structure at dev/build time — a root-layout Suspense is invisible to sibling client navigations. See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.

## App Architecture

- **Framework**: Next.js 16 App Router (TypeScript strict mode)
- **Styling**: Tailwind CSS v4 via `@import "tailwindcss"` in `globals.css`; theme tokens set with `@theme inline`
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`, exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`
- **Path alias**: `@/*` maps to `./` (project root inside `frontend/`)
- **ESLint**: Flat config (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- **Bundler**: Turbopack (default); `turbopack` config is top-level in `next.config.ts`, not under `experimental`

---

## UI Framework

**shadcn/ui** — component library built on Radix UI primitives with Tailwind CSS v4.

- Install components: `npx shadcn@latest add <component>`
- Always use shadcn/ui components before building custom primitives
- Initialise if not yet set up: `npx shadcn@latest init`

---

## Pages & Routing

| Route | Purpose |
|---|---|
| `/login` | Login page (unauthenticated) |
| `/home` | Landing hub after login — cards for Game Days, Cost Split, Manage Players, Logout |
| `/gamedays` | Game days list — all game days; click a row to go to edit |
| `/gamedays/new` | Create a new game day |
| `/gamedays/[id]/edit` | Edit an existing game day |
| `/cost-split` | Cost split calculator |
| `/players` | Manage the reusable player roster (create / edit / delete) |

---

## Header (all authenticated pages)

- **Left side:** `"Hello, {username}"`
- **Right side:** three buttons — [Game Days] [Cost Split] [Logout]
- **Logout flow:** clicking Logout opens a confirmation dialog ("Are you sure you want to logout?") before clearing the JWT and redirecting to `/login`

---

## Game Day Form (create & edit pages)

Fields in the form:

| Field | Type |
|---|---|
| Date | Date picker |
| Number of courts | Numeric input |
| Number of hours played | Numeric input |
| Total price | Currency input |
| Players in attendance | Checkbox pick-list from the user's roster (name only); a "New Player" dialog adds a roster entry inline. Players removed from the roster but already on the game day appear pre-checked and disabled ("orphans"). |

---

## Cost Split Page

1. User selects a game day from a dropdown
2. A checkbox list of that game day's players is shown (all checked by default)
3. User checks which players will pay
4. Calculated amount per selected player = `total price / number of selected players`
5. The per-player amount is displayed clearly next to each selected player's name

---

## Authentication

- JWT received from `POST /auth/login` (backend)
- Store JWT in `localStorage`
- On every page load, check for a valid JWT; if absent or expired, redirect to `/login`
- Attach JWT to all API requests: `Authorization: Bearer <token>`

---

## Environment Variables

- `.env.local` — local development (not committed to git; Next.js loads automatically)
- `.env.production` — production values
- Public vars (exposed to browser) must use the `NEXT_PUBLIC_` prefix
- Key variable: `NEXT_PUBLIC_API_BASE_URL` — backend API base URL
- DO NOT hard code values in docker-compose.yaml files. Always use environment variables.

---

## Running Locally

```bash
# Prerequisites: Node.js 22+, backend API running (http://localhost:8080)
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```
If the build fails and you have to make changes, ALWAYS prompt the user for guidance.
If docker does not work, NEVER use any other software to simulate Postgres.
