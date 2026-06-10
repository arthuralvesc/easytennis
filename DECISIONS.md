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

---

## [2026-06-05] feat(ui): home page with feature cards

### Log

```
[LOG - 2026-06-05T00:00:00Z]
Change: Add /home page as the first page after login, with square cards for Game Days, Cost Split, and Logout; add Back buttons on Game Days and Cost Split pages
Reason: Users previously landed on the Game Days list with no central navigation hub; the new home page provides a clear entry point and consistent way to reach all main features
Approach: New page.tsx at app/(protected)/home/; three shadcn Card components in a responsive 3-column grid; Logout card reuses the same Dialog confirmation pattern as the Header; root redirect and post-login redirect updated to /home; Back button added as ghost Button with ChevronLeft icon
```

### Key Decisions

| Decision | Rationale |
|---|---|
| Reuse existing `Card` shadcn component with `aspect-square` | No new primitives needed; `aspect-square` enforces square shape regardless of content size |
| Default `rounded-lg` on Card — no override needed | `rounded-lg` (10px) already gives the rounded-corner look requested; a custom override would be inconsistent with other cards |
| Logout card opens the same Dialog already used in the Header | Consistent UX; user already knows the confirmation flow |
| Back button uses `variant="ghost" size="sm"` + `ChevronLeft` | Matches the ghost navigation buttons already in the Header; unobtrusive and visually consistent |
| `sm:grid-cols-3` responsive grid | On small screens each card stacks vertically; on sm+ they sit side-by-side as a 3-col row |

### Changes Applied

| File | Change |
|---|---|
| `app/(protected)/home/page.tsx` | Created — 3-card grid page with logout dialog |
| `app/page.tsx` | Root redirect changed from `/gamedays` to `/home` |
| `app/(auth)/login/page.tsx` | Post-login `router.push` changed from `/gamedays` to `/home` |
| `app/(protected)/gamedays/page.tsx` | Added `ChevronLeft` import + Back button linking to `/home` |
| `app/(protected)/cost-split/page.tsx` | Added `useRouter`, `ChevronLeft` imports + Back button linking to `/home` |

### Build & Lint Result

- `npm run build`: ✅ Compiled successfully — `/home` route listed
- `eslint .`: ✅ No warnings or errors

### Next Steps

- Commit and push `feature/loading-spinners` branch
- Open PR to `master`

---

## [2026-06-05] feat(players): manage players page + game day pick-list

### Log

```
[LOG - 2026-06-05T20:00:00Z]
Change: Add PlayerProfile entity + /players management page + replace inline player fields in game day form with a pick-list
Reason: Users need a reusable roster of frequent players rather than re-entering names/emails every game day
Approach: New PlayerProfile JPA entity (player_profiles table, per-user, ddl-auto creates it); CRUD REST controller at /players/**; new /players frontend page with search/create/edit/delete; GameDayForm refactored to a checkbox pick-list; home page gets a 4th "Manage Players" card
```

### Key Decisions

| Decision | Rationale |
|---|---|
| `PlayerProfile` as a new `@Entity` (not promoting `Player` embeddable) | `Player` is `@Embeddable` stored in `game_day_players`; promoting it would require a schema migration. A new `player_profiles` table keeps the existing data model intact |
| `@UniqueConstraint(columnNames = {"user_id", "email"})` | Players are per-user; the same email may appear in another user's list |
| `IllegalArgumentException` → 409 on duplicate email | Reuses the existing `GlobalExceptionHandler.handleIllegalArgument` mapping — no handler change needed |
| No `SecurityConfig` change | `anyRequest().authenticated()` already covers `/players/**` |
| `orphanPlayers` prop in `GameDayForm` | Players that pre-date the feature (or were removed from the managed list) must still be preserved in an edited game day; they appear as pre-checked, disabled rows with an "— not in list" label |
| `Promise.all` for edit page parallel fetch | Avoids sequential latency when loading both the game day and the player list |
| Client-side search with `useMemo` | Player lists are small (per-user); no server round-trip needed for filtering |

### Changes Applied

**Backend (already committed in prior session):**

| File | Change |
|---|---|
| `api/.../entity/PlayerProfile.java` | New `@Entity` — id, name, email, user (FK) |
| `api/.../repository/PlayerProfileRepository.java` | New repo — findAllByUserOrderByNameAsc, findByIdAndUser, existsByUserAndEmail |
| `api/.../dto/player/PlayerProfileRequest.java` | New record — @NotBlank name, @NotBlank @Email email |
| `api/.../dto/player/PlayerProfileResponse.java` | New record — Long id, String name, String email |
| `api/.../service/PlayerProfileService.java` | CRUD service — list, create (409 on dup), update (email-change check), delete |
| `api/.../controller/PlayerProfileController.java` | GET /players, POST /players, PUT /players/{id}, DELETE /players/{id} |

**Frontend:**

| File | Change |
|---|---|
| `frontend/app/lib/api.ts` | Added `PlayerProfileResponse`, `PlayerProfileRequest` types; added `api.players` namespace |
| `frontend/app/(protected)/players/page.tsx` | Created — list with search, create/edit/delete dialogs, Back → /home |
| `frontend/app/components/GameDayForm.tsx` | Removed `players` zod field + useFieldArray; added checkbox pick-list, orphan players, "New Player" dialog |
| `frontend/app/(protected)/gamedays/new/page.tsx` | Fetches player list, passes `availablePlayers` to GameDayForm |
| `frontend/app/(protected)/gamedays/[id]/edit/page.tsx` | Parallel-fetches game day + players; computes initialSelectedEmails + orphanPlayers |
| `frontend/app/(protected)/home/page.tsx` | Added "Manage Players" card (4th); grid changed to `grid-cols-2 sm:grid-cols-4` |

### Build & Lint Result

- `npm run build`: ✅ Compiled successfully — `/players` route listed
- `eslint .`: ✅ No warnings or errors

### Next Steps

- Commit and push `feature/loading-spinners` branch
- Open draft PR to `master`

---

## [2026-06-10] refactor(players): remove email from player roster + game-day snapshot

### Log

```
[LOG - 2026-06-10T00:00:00Z]
Change: Remove the `email` property from the player concept — both the roster
PlayerProfile entity and the embedded Player snapshot stored on game days. Email
is no longer collected when creating a player or assigning one to a game day.
Reason: Casual players don't have/need an email on file; forcing one added
friction. Email was never used for notifications — only as an identity key.
Approach: Replace email-as-identity with (a) a nullable `profileId` on the
embedded Player linking back to the roster entry, used for pick-list
pre-selection and orphan detection, and (b) player **index** within the game
day's player list for cost-split selection (works uniformly for roster-linked,
orphan, and duplicate-named players, which a nullable profileId cannot).
```

### Key Decisions

| Decision | Rationale |
|---|---|
| Embedded `Player` gains nullable `Long profileId` (replaces `email`) | Links a game-day snapshot back to its roster `PlayerProfile` for pre-selection/orphan detection. Null = ad-hoc/legacy player with no roster entry. |
| Cost-split matches by **player index**, not profileId | Orphan/ad-hoc players have `null` profileId and two of them can't be distinguished; index identifies any player in the snapshot unambiguously. `CostSplitRequest.payingPlayerEmails` → `payingPlayerIndexes: List<Integer>`. |
| `PlayerSplitDto` carries `playerIndex` (drops `email`) | Lets the frontend map returned amounts back to the rendered player rows by index. |
| Roster de-duplication removed | Email was the uniqueness key; with duplicate names now allowed (each roster entry is distinct by id), `existsByUserAndEmail` and the `@UniqueConstraint(user_id, email)` are dropped. No 409 on create/update. |
| Drop SQL for existing columns | `ddl-auto=update` auto-adds `game_day_players.profile_id` but never drops the NOT NULL `email` columns → inserts would fail. Manual migration drops them. Existing rows get `profile_id = NULL` → preserved as orphans. |
| User account email untouched | `User.email` is the auth principal — entirely separate from the player concept; all auth flows unchanged. |

### Changes Applied

**Backend (`api/src/main/java/com/easytennis/`):**

| File | Change |
|---|---|
| `entity/Player.java` | `email` → nullable `Long profileId` |
| `entity/PlayerProfile.java` | Removed `email` field + `@UniqueConstraint(user_id, email)` |
| `repository/PlayerProfileRepository.java` | Removed `existsByUserAndEmail` |
| `dto/player/PlayerProfileRequest.java` / `PlayerProfileResponse.java` | Dropped `email` |
| `dto/gameday/PlayerDto.java` | `email` → `Long profileId` |
| `dto/costsplit/CostSplitRequest.java` | `payingPlayerEmails` → `payingPlayerIndexes: List<Integer>` |
| `dto/costsplit/PlayerSplitDto.java` | `email` → `int playerIndex` |
| `service/PlayerProfileService.java` | Removed duplicate-email checks; create/update set name only |
| `service/GameDayService.java` | Map `profileId` instead of `email` both directions |
| `service/CostSplitService.java` | Index-based selection + range validation; removed `Set<String>` email filter |

**Frontend (`frontend/app/`):**

| File | Change |
|---|---|
| `lib/api.ts` | Updated `PlayerDto`, `PlayerSplitDto`, `PlayerProfile*`, `costSplit.calculate` signatures |
| `(protected)/players/page.tsx` | Removed all email state, inputs, and display; name-only create/edit |
| `components/GameDayForm.tsx` | `selectedEmails` → `selectedProfileIds`; Add-player dialog name-only; orphans keyed by `profileId` |
| `(protected)/gamedays/[id]/edit/page.tsx` | Compute `initialSelectedProfileIds` + orphans by `profileId` |
| `(protected)/cost-split/page.tsx` | `checkedEmails` → `checkedIndexes`; amounts mapped by `playerIndex` |

### Database Migration (run on local + Neon)

```sql
ALTER TABLE player_profiles  DROP COLUMN IF EXISTS email CASCADE;
ALTER TABLE game_day_players DROP COLUMN IF EXISTS email;
```

### Build / Test Result

- Backend `mvnw.cmd compile`: ✅ clean
- Frontend `npm run build`: ✅ compiled, TypeScript clean
- `eslint .`: ✅ no warnings or errors
- Backend `mvnw.cmd test`: ✅ 12/12 green (after fixing two **pre-existing** issues
  surfaced during verification, both unrelated to the player change):
  - `AuthServicePasswordResetTest.sendResetCode_throwsWhenEmailNotFound` was stale —
    `AuthService.sendResetCode` had been changed to silently no-op on an unknown email
    (the user-enumeration security fix), but the test still asserted a throw. Renamed to
    `sendResetCode_silentlyNoOpsWhenEmailNotFound` and updated to assert no-throw + no email sent.
  - `ApiApplicationTests.contextLoads` couldn't load the context: `src/test/resources/
    application.properties` shadows the main file but didn't define the custom `@Value`
    placeholders (`jwt.secret`, `jwt.expiration.ms`, `cors.allowed.origins`) or a mail host.
    Added throwaway test values so the context loads against the local Postgres.

### Next Steps

- Run the migration SQL against local Postgres (Docker) and Neon before deploy
- Manual end-to-end verification of players / game day / cost-split flows
- Open PR to `master`
