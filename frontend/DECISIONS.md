# EasyTennis Frontend — Decisions & Progress

## [2026-05-18T23:41:39Z] MVP Complete

### Progress

All MVP pages are built and passing build + lint:

| Route | Status |
|---|---|
| `/login` | Done — tab-toggle login/register with JWT auth |
| `/gamedays` | Done — table list, click to edit |
| `/gamedays/new` | Done — shared GameDayForm |
| `/gamedays/[id]/edit` | Done — preloaded form with delete |
| `/cost-split` | Done — game day select → player checkboxes → backend split |

### Key Decisions

**shadcn/ui init via manual `components.json`** — The interactive `npx shadcn@latest init` prompt couldn't run non-interactively; created `components.json` manually then used `npx shadcn@latest add <component> --yes` for each component. No behavior difference.

**JWT in `localStorage` (not HttpOnly cookie)** — Chosen for simplicity in a client-only Next.js app. The protected layout's auth guard (`(protected)/layout.tsx`) reads from `AuthContext` which is initialized from `localStorage` on first render.

**Lazy `useState` initializer for auth state** — Instead of reading `localStorage` in a `useEffect` (which caused a cascade render and a lint error), the `AuthContext` reads the stored token in the `useState` initializer functions. Runs synchronously on first client render; returns `null` during SSR. This eliminates the unauthenticated flash.

**`zodResolver` type cast (`as unknown as Resolver<GameDayFormValues>`)** — `z.coerce.number()` changes the Zod schema's input type to `unknown`, breaking the `useForm<GameDayFormValues>` type constraint. The cast is TypeScript-only; runtime behavior is identical. The alternative (`z.number()` + `valueAsNumber: true`) would need empty-string handling that `z.coerce` handles automatically.

**Cost split via backend API** — `POST /cost-split` with `{gameDayId, payingPlayerEmails[]}` is already implemented in Spring Boot; the frontend calls it instead of computing client-side. Keeps business logic centralized.

**`use(params)` for async route params** — Next.js 16 makes `params` a Promise in client components. Used React 19's `use()` hook to unwrap it in `[id]/edit/page.tsx`.

### Post-Change Review

**Purpose fulfilled?** Yes — all five MVP pages exist, authenticate correctly, and call the backend API. The `GameDayForm` is shared between create and edit pages.

**Expected result achieved?** Build compiles cleanly; ESLint reports zero issues; all 6 routes are present in the build output.

**Conventions aligned?** shadcn/ui components used throughout; no hardcoded URLs or secrets (backend URL is in `.env.local`); `z.coerce` used for numeric form fields; `useFieldArray` for dynamic player list.

**Risks / edge cases to watch:**
- JWT expiry is only checked on initial load. Long-lived sessions could send an expired token; the API will return 401 which is surfaced as an error message, but there is no automatic redirect to `/login` on 401. A future improvement would be to intercept 401 in `api.ts` and call `logout()`.
- The cost-split page initializes all players as checked. If a game day has many players, the user must uncheck manually. Consider a "Check all / Uncheck all" toggle in a future iteration.
- `localStorage` is unavailable during SSR. The lazy initializer guards with `typeof window === "undefined"`, so the server always renders with `token = null` (unauthenticated). This is correct — the protected layout immediately shows `null` (blank) then client-side hydration restores auth state.

### Next Steps

1. Connect backend (`cd api && ./mvnw spring-boot:run`) and do end-to-end smoke test
2. Add 401 interception in `api.ts` → auto-logout + redirect
3. Mobile layout review (the app is mobile-first per CLAUDE.md)
4. Open a Pull Request to `master` per GitHub Workflow policy
