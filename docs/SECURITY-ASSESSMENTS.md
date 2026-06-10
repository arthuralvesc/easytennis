# Security Assessments

This file records all security audits performed on the EasyTennis codebase. Each entry is dated and contains the full findings, verdicts, and action items from that review.

---

## Assessment 2026-05-20

**Reviewer:** Claude Code (claude-sonnet-4-6)
**Scope:** Full backend audit — `api/src/` (Spring Boot), `frontend/` (Next.js)
**Standard:** `docs/SECURITY-REVIEW.md` + `.claude/skills/SECURITY-REVIEWER.md`
**Branch:** `feature/loading-spinners`

---

### Category 1 — Authentication & Authorization

**1.1 Password Hashing — PASS**
`BCryptPasswordEncoder` is a `@Bean` in `SecurityConfig.java:66`. Encoding is called in `AuthService.java:46` (register) and `:104` (password reset). Every write path hashes before persistence.

**1.2 JWT Token Expiry / Refresh Rotation — FAIL**
Default TTL is `86400000` ms = **24 hours** (`application.properties:16`). Threshold is ≤ 60 minutes. No `RefreshToken` entity, no `/auth/refresh` endpoint, and no rotation logic exists anywhere in the codebase.

**1.3 JWT Secret Strength & Storage — PASS**
`application.properties:15` references `${JWT_SECRET}` — no literal value. `.gitignore` lines 9–10 cover `.env` and `.env.*`. `git ls-files | grep .env` returns nothing. Dev profile uses a clearly-marked dev secret in `application-dev.properties:8`.

**1.4 RBAC on Every Endpoint — PASS**
`SecurityConfig.java:43-45`: `/auth/**` is `permitAll()`, `anyRequest().authenticated()` covers everything else. GameDay and CostSplit controllers sit behind authentication. No accidentally-public routes found.

**1.5 Password Reset Code Expiry & Single-Use — PASS**
`AuthService.java:28`: TTL = 15 minutes. `SecureRandom` used at `:29`. On successful reset, `deleteByEmail()` is called at `:107` — code is invalidated after use.

---

### Category 2 — Input Validation & Injection

**2.1 Input Validation on DTOs — PASS**
All DTOs (`RegisterRequest`, `LoginRequest`, `ForgotPasswordRequest`, `VerifyResetCodeRequest`, `ResetPasswordRequest`, `GameDayRequest`, `PlayerDto`, `CostSplitRequest`) carry `@NotBlank`, `@Email`, `@Size`, `@Pattern`, `@NotNull`, `@Positive` as appropriate. Every controller method that accepts a body uses `@Valid`.

**2.2 SQL Injection — PASS**
Spring Data JPA used throughout — all queries are parameterized by the framework. No raw SQL string concatenation found.

**2.3 XSS Prevention — NEEDS-REVIEW**
`dangerouslySetInnerHTML` is not used in the frontend. However, no `Content-Security-Policy` header is configured on the API (see 3.5). The frontend's CSP posture depends on Next.js defaults and Vercel headers, which must be verified separately.

**2.4 Shell Command Injection — PASS**
No `Runtime.getRuntime().exec()`, `ProcessBuilder`, or `child_process` usage found.

---

### Category 3 — API Security

**3.1 CORS — PASS (minor note)**
`allowedOrigins` is loaded from `${CORS_ALLOWED_ORIGINS}` — explicit domains, not `*`. `allowCredentials(true)` is not paired with a wildcard. Minor: `allowedHeaders` is `List.of("*")` at `SecurityConfig.java:75` — could be tightened to `Authorization, Content-Type`.

**3.2 Rate Limiting — FAIL**
No rate-limiting library (Bucket4j, resilience4j, etc.) found anywhere. `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, and `/auth/verify-reset-code` have no throttle protection — brute-force attacks are unconstrained.

**3.3 HTTPS Enforced — NEEDS-REVIEW**
No HTTP redirect or HSTS enforcement visible in application code. Render and Vercel enforce HTTPS at the platform level but must be manually confirmed in deployment settings.

**3.4 Sensitive Endpoints Require Authentication — PASS**
`anyRequest().authenticated()` at `SecurityConfig.java:45` ensures all non-auth routes require a valid JWT.

**3.5 HTTP Security Headers — FAIL**
`SecurityConfig.java` has no `.headers()` call. Spring Security defaults enable `X-Content-Type-Options`, `X-Frame-Options`, and `X-XSS-Protection`, but the following critical headers are absent:
- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`

`server.error.include-stacktrace` is also not explicitly set to `never` in `application.properties`.

---

### Category 4 — Secrets Management

**4.1 No Hardcoded Secrets — PASS**
All credentials in `application.properties` use `${ENV_VAR}` syntax. Dev-profile secrets are clearly scoped and acceptable for local use.

**4.2 `.env` Gitignored — PASS**
`.gitignore` lines 9–10: `.env` and `.env.*` both listed. `git ls-files | grep .env` returns empty.

**4.3 Different Secrets per Environment — NEEDS-REVIEW**
Cannot be verified from source code. Developer must confirm that `JWT_SECRET`, `DB_*`, and `MAIL_*` values differ between dev and production.

**4.4 Exposed Secret Rotation — NEEDS-REVIEW**
Git history not fully scanned. Developer should run:
```bash
git log -p -- "*.properties" "*.yml" | grep -i "secret\|password\|token"
```

---

### Category 5 — Dependencies

**5.1 / 5.2 Vulnerable / Outdated Dependencies — NEEDS-REVIEW**
`npm audit` and `mvn dependency-check:check` were not run. The OWASP Dependency-Check plugin is not present in `pom.xml`. Both must be run and pass before next deployment.

---

### Category 6 — Error Handling & Logging

**6.1 Stack Traces Not Returned to Clients — PASS (with note)**
`GlobalExceptionHandler.java:47-51` returns `"An unexpected error occurred"` for all unhandled exceptions. `BadCredentialsException` returns the generic `"Invalid username or password"`. No stack trace in any response. `server.error.include-stacktrace` should still be explicitly set to `never`.

**6.2 Sensitive Data Not Logged — PASS**
`AuthService.java` has no logger — no risk of accidentally logging passwords or tokens.

**6.3 Failed Auth Attempts Not Logged — FAIL**
`AuthService.login()` delegates directly to `authenticationManager.authenticate()` with no `try/catch` and no logging. `BadCredentialsException` is silently handled by `GlobalExceptionHandler` with no audit trail. Brute-force attacks are invisible in logs.

---

### Category 7 — Data Protection

**7.1 Sensitive Data Encrypted at Rest — NEEDS-REVIEW**
Infrastructure-level setting. Must be verified in the Render PostgreSQL dashboard.

**7.2 DB Connection Uses TLS — NEEDS-REVIEW**
The `${DB_URL}` placeholder does not enforce `sslmode=require`. The production URL must include it explicitly — cannot be confirmed from source code alone.

**7.3 Minimal Data Collection — PASS**
User entity: `name`, `email`, `passwordHash`. GameDay: operational fields only. No unnecessary PII stored.

---

### Additional Finding — User Enumeration

**`AuthService.sendResetCode()` — FAIL (HIGH)**
`AuthService.java:64-65`: when an email is not found, `IllegalArgumentException("No account found for this email address")` is thrown, resulting in a `409 CONFLICT` response. A found email returns `200`. This behavioral difference allows an attacker to enumerate registered email addresses via `/auth/forgot-password`.

---

### Audit Summary Table

| # | Item | Verdict |
|---|------|---------|
| 1.1 | Password hashing | PASS |
| 1.2 | JWT expiry / refresh rotation | FAIL |
| 1.3 | JWT secret storage | PASS |
| 1.4 | RBAC on every endpoint | PASS |
| 1.5 | Password reset code expiry & single-use | PASS |
| 2.1 | Input validation on DTOs | PASS |
| 2.2 | SQL injection prevention | PASS |
| 2.3 | XSS prevention | NEEDS-REVIEW |
| 2.4 | Shell command injection | PASS |
| 3.1 | CORS configuration | PASS |
| 3.2 | Rate limiting on auth endpoints | FAIL |
| 3.3 | HTTPS enforced | NEEDS-REVIEW |
| 3.4 | Sensitive endpoints require auth | PASS |
| 3.5 | HTTP security headers | FAIL |
| 4.1 | No hardcoded secrets | PASS |
| 4.2 | `.env` gitignored | PASS |
| 4.3 | Different secrets per environment | NEEDS-REVIEW |
| 4.4 | Exposed secret rotation | NEEDS-REVIEW |
| 5.1 | No known vulnerable dependencies | NEEDS-REVIEW |
| 5.2 | Dependencies up to date | NEEDS-REVIEW |
| 6.1 | Stack traces not returned to clients | PASS |
| 6.2 | Sensitive data not logged | PASS |
| 6.3 | Failed auth attempts logged | FAIL |
| 7.1 | Sensitive data encrypted at rest | NEEDS-REVIEW |
| 7.2 | DB connection uses TLS | NEEDS-REVIEW |
| 7.3 | Minimal data collected | PASS |
| — | User enumeration in forgot-password | FAIL |

---

### Action Items

#### Critical — fix before next deploy
- **[1.2]** Reduce JWT access token TTL from 24h to ≤ 15 min (`application.properties:16`). Implement refresh token entity, `/auth/refresh` endpoint, and rotation logic.

#### High — fix this sprint
- **[3.2]** Add Bucket4j rate limiting filter for `/auth/login` (5 req/min), `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-reset-code` (3 req/min). Return `429 Too Many Requests` with `Retry-After` header.
- **[3.5]** Add `.headers()` block to `SecurityConfig.java` with CSP, HSTS, and Referrer-Policy. Add `server.error.include-stacktrace=never` to `application.properties`.
- **[USER-ENUM]** `AuthService.sendResetCode()`: return `200` silently regardless of whether the email is found. Log the miss at `DEBUG` level internally.

#### Medium — address within the month
- **[6.3]** Wrap `authenticationManager.authenticate()` in `AuthService.login()` with a `try/catch`. Log `"Failed login attempt for email={}"` on `BadCredentialsException`, then re-throw.

#### Needs infrastructure verification (cannot confirm from code)
- **[3.3]** Confirm HTTPS redirect is active in Render and Vercel settings.
- **[7.1]** Confirm DB encryption at rest is enabled in Render PostgreSQL dashboard.
- **[7.2]** Confirm production `DB_URL` includes `?sslmode=require`.
- **[4.3]** Confirm dev and production secrets are distinct values.
- **[5.1]** Run `npm audit` (frontend) and `mvn dependency-check:check` (backend). Add OWASP plugin to `pom.xml` for CI automation.
