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

---

## [2026-05-19] feat(auth): forgot-password flow (email OTP, 3-step UI)

### Log

```
[LOG - 2026-05-19T15:45:00Z]
Change: Add forgot-password feature — backend reset-code endpoints + Gmail SMTP + frontend 3-step UI
Reason: Users have no recovery path when they forget their password
Approach: SecureRandom 6-digit OTP stored in password_reset_codes table (15-min TTL); Gmail App Password via JavaMailSender; frontend multi-mode form (forgot → verify → reset)
```

### Key Decisions

| Decision | Rationale |
|---|---|
| `EmailService` interface + `EmailServiceImpl` | Open/Closed principle — tests mock the interface; the Gmail implementation can be swapped without touching `AuthService` |
| `PasswordResetCode` as a JPA entity (not in-memory) | Survives pod restarts; `ddl-auto=update` auto-creates the table — no manual migration needed for this MVP |
| `deleteByEmail` before saving new code | Prevents multiple valid codes per email; `@Transactional` on `sendResetCode` keeps delete+save atomic |
| Gmail credentials in `.env.development` and `.env.production` only | User requirement: "DO NOT HARDCODE THEM, MAKE THEM ENVIRONMENT VARIABLES"; `${MAIL_USER}` and `${MAIL_PASSWORD}` in `application.properties` |
| Multi-mode form (`login \| register \| forgot \| verify \| reset`) | All steps share one card; no new routes needed; `resetEmail` / `resetCode` state threads context between steps |
| `inputMode="numeric"` on OTP input | Triggers numeric keyboard on mobile without type="number" (which strips leading zeros) |
| `confirmPassword` field in `resetSchema` via `.refine()` | Client-side guard before the API call; avoids a round-trip for a trivially detectable mismatch |

### Changes Applied

| File | Change |
|---|---|
| `api/pom.xml` | Added `spring-boot-starter-mail` dependency |
| `api/src/main/resources/application.properties` | Added Gmail SMTP config using `${MAIL_USER}` / `${MAIL_PASSWORD}` |
| `api/.env.development` | Added `MAIL_USER` and `MAIL_PASSWORD` |
| `api/.env.production` | Created with `MAIL_USER` and `MAIL_PASSWORD` (JWT_SECRET placeholder) |
| `api/.../entity/PasswordResetCode.java` | New JPA entity — email, code, expiresAt |
| `api/.../repository/PasswordResetCodeRepository.java` | New Spring Data repo — findByEmailAndCode, deleteByEmail |
| `api/.../dto/auth/ForgotPasswordRequest.java` | New record — email |
| `api/.../dto/auth/VerifyResetCodeRequest.java` | New record — email, 6-digit code |
| `api/.../dto/auth/ResetPasswordRequest.java` | New record — email, code, newPassword |
| `api/.../service/EmailService.java` | New interface — sendPasswordResetCode |
| `api/.../service/EmailServiceImpl.java` | Gmail implementation via JavaMailSender |
| `api/.../service/AuthService.java` | Added sendResetCode, verifyResetCode, resetPassword methods |
| `api/.../controller/AuthController.java` | Added /forgot-password, /verify-reset-code, /reset-password endpoints |
| `api/.../test/.../EmailServiceTest.java` | 3 unit tests — recipient, body contains code, non-blank subject |
| `api/.../test/.../AuthServicePasswordResetTest.java` | 8 unit tests — all happy/sad paths for all 3 service methods |
| `frontend/app/lib/api.ts` | Added forgotPassword, verifyResetCode, resetPassword to api.auth |
| `frontend/app/(auth)/login/page.tsx` | Added forgot/verify/reset modes, new schemas, form instances, handlers |

### Test Results

- Backend: 11/11 tests pass (`EmailServiceTest` 3, `AuthServicePasswordResetTest` 8)
- Frontend: `npm run build` compiled clean, TypeScript clean
- ESLint: no warnings or errors

### Security Review

- Credentials never appear in source code — only in `.env.*` files excluded from git
- `SecureRandom` (cryptographically secure) used for code generation, not `Math.random()`
- OTP has a 15-minute expiry enforced server-side on both verify and reset endpoints
- Old codes deleted before issuing a new one (prevents code accumulation attacks)
- No email enumeration hardening (throws on unknown email) — acceptable for MVP

### Next Steps

- Commit and push `feature/loading-spinners` branch (includes this change)
- Open draft PR to `master`
