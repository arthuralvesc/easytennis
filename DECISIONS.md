# DECISIONS.md

## [2026-05-18] feat(auth): email-based login, display name, currency input, 409 handling

### Progress Summary

All 5 requirements from the plan have been implemented, built, and pushed on `feature/email-login-currency-input`.

### Key Decisions

| Decision | Rationale |
|---|---|
| Map renamed `User.name` to existing `username` DB column via `@Column(name="username")` | Avoids any schema migration; the DB column meaning is unchanged, only the Java field name changed to reflect its purpose as a display name |
| `getUsername()` override returns `email` | Spring Security `UserDetails` contract requires `getUsername()` to return the authentication principal; email is now that principal |
| Add `name` as a custom JWT claim | Separates the login identifier (`sub` = email) from the display name shown in the UI header; avoids exposing email as a greeting |
| `optional:file:.env.development` in `spring.config.import` | Allows CI to inject `JWT_SECRET` via environment variable without the file being present; `optional:` prefix prevents crash when file is absent |
| Right-to-left currency input with comma separator | Brazilian R$ convention; digit accumulation from the right gives a natural ATM-style entry experience |

### Next Steps

- Open the draft PR at https://github.com/arthuralvesc/easytennis/pull/new/feature/email-login-currency-input
- Run integration tests after `docker compose up -d` (`mvnw.cmd test`)
- Review and merge PR to `master`

---

## [2026-05-18] feat(ui): loading spinners for all async operations

### Log

```
[LOG - 2026-05-18T22:00:00Z]
Change: Add loading spinners across the frontend for API calls, form submissions, and auth checks
Reason: Improve perceived performance and user feedback during async operations
Approach: Reusable Spinner/PageSpinner components from Loader2 (lucide-react); applied to page-level loading, button loading states, and protected layout auth check
```

### Options Considered

| Option | Description | Decision |
|---|---|---|
| `Loader2` from `lucide-react` (chosen) | Single icon + `animate-spin`; zero new dependencies; already installed | **Selected** |
| shadcn/ui `Skeleton` | Placeholder content blocks per element; better for content-heavy pages | Overkill for this MVP's simple pages |
| Custom CSS spinner | Pure CSS; no dependency | Unnecessary — `lucide-react` is already a project dependency |

### Component Design

Two exports from `app/components/Spinner.tsx`:

| Export | Use Case | Placement |
|---|---|---|
| `Spinner` | Inline, inside buttons during submission/loading | Next to button label text |
| `PageSpinner` | Full-centered, for page-level async waits | Replaces page body while data loads |

**Why two variants instead of one:** The centering and sizing context differs fundamentally — buttons need an inline, compact icon; pages need a full viewport-centered layout. A single component with flags would add conditional logic for no gain.

### Changes Applied

| File | Change |
|---|---|
| `app/components/Spinner.tsx` | Created — `Spinner` (inline) and `PageSpinner` (page-level) |
| `app/(protected)/gamedays/page.tsx` | `loading` state → `<PageSpinner />` |
| `app/(protected)/gamedays/[id]/edit/page.tsx` | `loading` state → `<PageSpinner />` |
| `app/(protected)/cost-split/page.tsx` | `loading` state → `<PageSpinner />`; Calculate button → `<Spinner />` |
| `app/components/GameDayForm.tsx` | Submit and Delete buttons → `<Spinner />` during action |
| `app/(auth)/login/page.tsx` | Login and Register buttons → `<Spinner />` during submission |
| `app/(protected)/layout.tsx` | Auth check pending state → `<PageSpinner />` (was blank flash) |

### Build & Lint Result

- `npm run build`: ✅ Compiled successfully
- `eslint .`: ✅ No warnings or errors

### Next Steps

- Commit and push `feature/loading-spinners` branch
- Open PR to `master`
