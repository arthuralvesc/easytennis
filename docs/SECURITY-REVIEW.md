# Security Review Checklist

This document lists critical security concerns for production applications and explains how to evaluate each one. Use it as a recurring audit guide before and after major releases.

---

## 1. Authentication & Authorization

### 1.1 Passwords hashed with bcrypt/argon2
**Concern:** Storing plaintext or weakly hashed passwords allows attackers to read them if the database is compromised.

**How to evaluate:**
- Search the codebase for any `save`/`create` calls on user entities and verify the password is passed through an encoder before persistence.
- In Spring Boot: confirm `PasswordEncoder` (e.g., `BCryptPasswordEncoder`) is injected and called before saving.
- In the database, inspect a user row — the password column should start with `$2a$` (bcrypt) or `$argon2` (argon2), never a readable string.
- Run: `SELECT password FROM users LIMIT 1;` — if it reads like plain text, it fails.

---

### 1.2 JWT tokens have short expiry + refresh token rotation
**Concern:** Long-lived tokens give attackers a large window if stolen.

**How to evaluate:**
- Find the JWT generation code and check the expiry value. Access tokens should be ≤ 15–60 minutes; refresh tokens ≤ 7–30 days.
- Verify that when a refresh token is used to issue a new access token, the old refresh token is invalidated (rotation).
- Test: let an access token expire, confirm subsequent requests return 401.
- Test: reuse a refresh token after it has already been rotated — should return 401.

---

### 1.3 JWT secret is strong and stored in environment variables
**Concern:** A weak or hardcoded secret allows tokens to be forged.

**How to evaluate:**
- Search the codebase for the JWT secret: `grep -r "jwt.secret" .` or `grep -r "JWT_SECRET" .` — it must not appear as a literal string in source files.
- Confirm the secret is loaded from an environment variable or a secrets manager (e.g., `${JWT_SECRET}` in `application.properties`).
- Measure strength: the secret should be at least 32 random bytes (256 bits). A value generated with `openssl rand -base64 64` qualifies.
- Check `.env` files are in `.gitignore` and not committed to git: `git log --all --full-history -- "**/.env"`.

---

### 1.4 Role-based access control enforced on every endpoint
**Concern:** Missing authorization checks allow unprivileged users to access restricted resources.

**How to evaluate:**
- List all controllers/routes and verify each one has an explicit authorization annotation (`@PreAuthorize`, `@Secured`, or security config rules).
- In Spring Security: review `SecurityFilterChain` and confirm no route is accidentally left as `permitAll()` unless it truly should be public.
- Test with a tool like Postman: attempt to call an admin endpoint with a regular user's token — should return 403.
- Test: call a protected endpoint with no token — should return 401.

---

### 1.5 Password reset codes expire and are single-use
**Concern:** Long-lived or reusable reset codes allow account takeover even after the user has completed a reset.

**How to evaluate:**
- Find the reset code entity and check for an `expiresAt` or `createdAt` field with a TTL check (should be ≤ 15–30 minutes).
- Verify the code is deleted or marked as used after a successful reset.
- Test: complete a password reset, then attempt to reuse the same code — should return an error.
- Test: wait for the code to expire, then submit it — should return an error.

---

## 2. Input Validation & Injection

### 2.1 All user input validated before processing
**Concern:** Unvalidated input is the root cause of most injection attacks and unexpected application behavior.

**How to evaluate:**
- In Spring Boot: confirm all request DTOs use Bean Validation annotations (`@NotBlank`, `@Email`, `@Size`, etc.) and that `@Valid` is present on controller method parameters.
- In Next.js: confirm form inputs are validated before the API call (client-side) and that the API rejects bad input independently (server-side validation is mandatory).
- Test: send a request with an empty required field — should return 400 with a descriptive error, not 500.
- Test: send a string that is 10,000 characters where a short value is expected — should be rejected.

---

### 2.2 SQL injection prevented
**Concern:** Concatenating user input into SQL queries allows attackers to read, modify, or delete any data.

**How to evaluate:**
- Search for raw SQL string concatenation: `grep -r "query.*+" .` in Java files. Any query built with `+` and a variable is a red flag.
- Confirm JPA/Hibernate is used for all database access; native queries must use named parameters (`:param`), never string interpolation.
- Test with a tool like SQLMap or manually: submit `' OR '1'='1` as a login field and confirm it is rejected or returns no result.

---

### 2.3 XSS prevented
**Concern:** Injecting scripts via user-supplied content allows attackers to steal sessions or perform actions on behalf of other users.

**How to evaluate:**
- In Next.js: confirm `dangerouslySetInnerHTML` is never used with user-supplied data. All dynamic content should be rendered as text nodes, not HTML.
- Check HTTP response headers include `Content-Security-Policy` and `X-Content-Type-Options: nosniff`.
- Test: submit `<script>alert(1)</script>` in any text field that is later displayed — the script must not execute.

---

### 2.4 No user input passed to shell commands
**Concern:** Passing user input to `Runtime.exec()` or similar allows arbitrary command execution on the server.

**How to evaluate:**
- Search for `Runtime.getRuntime().exec`, `ProcessBuilder`, or equivalent in the codebase — if found, verify the arguments are never derived from user input.
- In Node.js: search for `child_process.exec` with variables in the command string.

---

## 3. API Security

### 3.1 CORS restricted to known origins
**Concern:** A wildcard (`*`) CORS policy allows any website to make credentialed requests to the API on behalf of a logged-in user.

**How to evaluate:**
- Find the CORS configuration (Spring `CorsConfigurationSource` or `@CrossOrigin`) and confirm `allowedOrigins` is set to explicit domains (e.g., `https://easytennis.vercel.app`), not `*`.
- Test: send a request with `Origin: https://evil.com` — confirm the response does not echo it back in `Access-Control-Allow-Origin`.
- Confirm `allowCredentials: true` is never combined with `allowedOrigins: *` (this is also rejected by browsers).

---

### 3.2 Rate limiting on auth endpoints
**Concern:** Without rate limiting, attackers can brute-force passwords or exhaust reset code attempts.

**How to evaluate:**
- Check for a rate-limiting library (e.g., Bucket4j, resilience4j, or a reverse-proxy rule in Render/Nginx).
- Confirm limits are applied specifically to `/auth/login`, `/auth/forgot-password`, and `/auth/reset-password`.
- Test: send 20+ rapid requests to `/auth/login` — after the threshold, requests should return 429 Too Many Requests.

---

### 3.3 HTTPS enforced everywhere
**Concern:** HTTP transmits credentials and tokens in plaintext, vulnerable to interception.

**How to evaluate:**
- Confirm the production deployment (Render, Vercel) serves only HTTPS and redirects HTTP to HTTPS.
- In Spring Boot: if behind a proxy, confirm `server.forward-headers-strategy=native` is set so secure redirects work correctly.
- Test: navigate to the `http://` version of the production URL — confirm it redirects to `https://`.
- Check the SSL certificate is valid and not expired using a tool like SSL Labs (https://www.ssllabs.com/ssltest/).

---

### 3.4 Sensitive endpoints require authentication
**Concern:** Forgetting to protect an endpoint exposes data or actions to unauthenticated users.

**How to evaluate:**
- Generate a full list of API endpoints (e.g., from Spring's actuator `/mappings` in a local environment).
- For each endpoint, confirm it requires a valid JWT unless it is explicitly a public endpoint (login, register, forgot-password).
- Test each protected endpoint with no Authorization header — should return 401.

---

### 3.5 HTTP security headers set
**Concern:** Missing headers leave browsers without important protections against clickjacking, MIME sniffing, and protocol downgrade attacks.

**How to evaluate:**
- Use securityheaders.com to scan the production URL.
- Required headers: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `Referrer-Policy`.
- In Spring Security: confirm `http.headers()` is configured or defaults are not disabled.

---

## 4. Secrets Management

### 4.1 No secrets hardcoded in source code
**Concern:** Secrets committed to git are permanently exposed — even after deletion, they remain in git history.

**How to evaluate:**
- Run a secret scanner: `npx secretlint "**/*"` or use trufflesec/trufflehog on the repository.
- Manually search for common patterns: `grep -r "password\s*=" . | grep -v ".env"`, `grep -r "secret\s*=" .`.
- Check git history: `git log -p | grep -i "secret\|password\|token\|key"`.
- If any secret is found in history, rotate it immediately — history cannot be safely rewritten once pushed.

---

### 4.2 `.env` files in `.gitignore`
**Concern:** Accidentally committing `.env` files exposes all secrets at once.

**How to evaluate:**
- Run: `cat .gitignore | grep ".env"` — confirm `.env`, `.env.local`, `.env.production` are listed.
- Run: `git ls-files | grep ".env"` — the result should be empty. If any `.env` file appears, it is tracked by git.

---

### 4.3 Different secrets per environment
**Concern:** Reusing production secrets in development increases the blast radius of a dev environment compromise.

**How to evaluate:**
- Compare the JWT secret, database credentials, and email service credentials between `.env.development` and `.env.production` — they must be different values.
- Confirm the production database is not accessible from a development machine (network-level restriction).

---

### 4.4 Rotate secrets that were ever exposed
**Concern:** A secret that was ever visible (in a log, a commit, a Slack message) must be considered compromised.

**How to evaluate:**
- Review git history and any CI/CD logs for accidental secret exposure.
- If found: rotate the secret immediately in the service that issued it, then update the environment variable in all deployments.

---

## 5. Dependencies

### 5.1 No known vulnerable dependencies
**Concern:** Dependencies with published CVEs are a common attack vector requiring minimal effort from attackers.

**How to evaluate:**
- Frontend: run `npm audit` — address all `high` and `critical` findings.
- Backend: run `mvn dependency-check:check` (OWASP Dependency-Check plugin) — review the generated report.
- Automate: add these checks to CI so new vulnerabilities are caught before merge.

---

### 5.2 Dependencies kept up to date
**Concern:** Outdated dependencies accumulate unpatched vulnerabilities over time.

**How to evaluate:**
- Frontend: run `npm outdated` and review the list.
- Backend: use `mvn versions:display-dependency-updates`.
- Establish a policy: review and update dependencies at least monthly, or use Dependabot/Renovate for automated PRs.

---

## 6. Error Handling & Logging

### 6.1 Stack traces never returned to clients
**Concern:** Stack traces reveal internal paths, library versions, and logic that attackers use to craft exploits.

**How to evaluate:**
- In Spring Boot: confirm a `@ControllerAdvice` global exception handler returns generic error messages (e.g., `{"error": "Internal server error"}`) without stack traces.
- Test: trigger a 500 error (e.g., invalid data that causes an unhandled exception) and inspect the response body — it must not contain a Java stack trace.
- Confirm `server.error.include-stacktrace=never` is set in the production profile.

---

### 6.2 Errors logged server-side without sensitive data
**Concern:** Logging passwords, tokens, or PII creates a secondary data leak vector via log files.

**How to evaluate:**
- Search logs (or log configuration) for any place where request bodies are logged wholesale — confirm passwords and tokens are masked.
- Review `logback-spring.xml` or equivalent for any pattern that logs `Authorization` headers.

---

### 6.3 Failed auth attempts logged
**Concern:** Without logging, brute-force attacks are invisible until damage is done.

**How to evaluate:**
- Confirm failed login attempts are logged with the username (not password) and IP address.
- Confirm the logs are accessible in the production environment (Render log stream, external log aggregator).
- Optionally: verify an alert or dashboard exists for spikes in auth failures.

---

## 7. Data Protection

### 7.1 Sensitive data encrypted at rest
**Concern:** If the database server is compromised, unencrypted sensitive data is immediately readable.

**How to evaluate:**
- Confirm the production database (e.g., Render PostgreSQL) has encryption at rest enabled — check the hosting provider's settings.
- Confirm any particularly sensitive fields (e.g., health data, payment info) are encrypted at the application layer in addition to disk encryption.

---

### 7.2 HTTPS for data in transit
**Concern:** Unencrypted connections expose all data to network interception.

**How to evaluate:**
- Same as 3.3 above — confirm all traffic between client, API, and database uses TLS.
- Confirm database connection strings use `sslmode=require` or equivalent.

---

### 7.3 Minimal data collected
**Concern:** Data you do not collect cannot be stolen or misused.

**How to evaluate:**
- Review the user entity and any other stored entities — identify any field that is not strictly necessary for the application to function.
- Confirm no analytics or logging captures more PII than needed.
- If operating under GDPR/LGPD: confirm a data retention and deletion policy exists and is enforced.

---

## Quick Audit Commands

```bash
# Check for secrets in tracked files
git ls-files | xargs grep -l "password\|secret\|token\|key" | grep -v ".gitignore"

# Check .env files are not tracked by git
git ls-files | grep ".env"

# Frontend vulnerability scan
cd frontend && npm audit

# Backend dependency vulnerability check
cd api && mvn dependency-check:check

# Check security headers on production
curl -I https://your-production-url.com
```
