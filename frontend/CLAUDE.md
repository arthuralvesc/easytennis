# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Application Purpose

EasyTennis is a **mobile-first** web application for tracking tennis game days in court rental arenas. Users log game days, track costs, and split the bill among attending players.

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
| `/gamedays` | Game days list — all game days; click a row to go to edit |
| `/gamedays/new` | Create a new game day |
| `/gamedays/[id]/edit` | Edit an existing game day |
| `/cost-split` | Cost split calculator |

---

## Header (all authenticated pages)

- **Left side:** `"Hello, {username}"`
- **Right side:** three buttons — [Game Days] [Cost Split] [Logout]
- **Logout flow:** clicking Logout opens a confirmation dialog ("Are you sure you want to logout?") before clearing the JWT and redirecting to `/login`

---

## Game Day Form (create & edit pages)

Fields required in the form:

| Field | Type |
|---|---|
| Date | Date picker |
| Number of courts | Numeric input |
| Number of hours played | Numeric input |
| Total price | Currency input |
| Players in attendance | Dynamic list — each player has: name (text), email (text) |

Players can be added and removed dynamically within the form.

---

## Cost Split Page

1. User selects a game day from a dropdown
2. A checkbox list of that game day's players is shown
3. User checks which players will pay
4. Calculated amount per selected player = `total price / number of selected players`
5. The per-player amount is displayed clearly next to each selected player's name

---

## Authentication

- JWT received from `POST /auth/login` (backend)
- Store JWT in `localStorage` (or HttpOnly cookie — decide at implementation time)
- On every page load, check for a valid JWT; if absent or expired, redirect to `/login`
- Attach JWT to all API requests: `Authorization: Bearer <token>`

---

## Development Protocol (MANDATORY)

**Before every change**

1. read the DECISIONS.md file to make sure the current change plan fits with the history of the workflow. If there are risks or unresolved dependencies, prompt the user for guidance.
2. divide the change in small tasks
3. write a log entry in the commit message / PR description:

```
[LOG - <ISO 8601 timestamp>]
Change: <what the change is>
Reason: <why it is needed>
Approach: <how it will be implemented>
```

**After every change**:
1. Run `npm run build` — catches TypeScript errors
2. Run `eslint .` — lint
3. Review for new risks and uncovered edge cases, as well as code bad practices that can be fixed; Ask the following questions: What was the purpose of these changes? Was the purpose fulfilled? What was the expected result? Was this result achieved? Do the tools, code and design patterns align with the conventions of the project?  document your review and return it for fixing.
5. Verify no API URLs, tokens, or secrets are hardcoded — use `.env` files

---

**After the change review**
Write a summary of our progress, key decisions made, and next steps into a file called DECISIONS.md, with the time stamp of the change.

## Environment Variables

- `.env.local` — local development (not committed to git; Next.js loads automatically)
- `.env.production` — production values
- Public vars (exposed to browser) must use the `NEXT_PUBLIC_` prefix
- Key variable: `NEXT_PUBLIC_API_BASE_URL` — backend API base URL

---

## GitHub Workflow

- Every development task must be done on a **new branch** created from `master`
- Open a **Pull Request to `master`** for every branch — include the pre-change log and post-change review in the PR description
- Do not merge without passing build and lint

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
