# Production Deployment Guide

**Stack:** Vercel (frontend) · Render (backend) · Neon (PostgreSQL)

---

## Current State vs Production Target

| Concern | Local (now) | Production (target) |
|---|---|---|
| Database | Docker Compose (postgres:17 container) | Neon serverless PostgreSQL |
| Backend host | `localhost:8080` | Render web service (Docker) |
| Frontend host | `localhost:3000` | Vercel |
| Datasource config | Auto-configured by Spring Docker Compose | Explicit `spring.datasource.*` env vars |
| CORS origin | `http://localhost:3000` | Vercel domain |
| Email (SMTP) | Gmail app password in `.env.development` | Same Gmail credentials in Render env vars |

---

## Dependency Order

```
1. Neon (create DB)
        ↓
2. Render (deploy backend, needs JDBC URL)
        ↓
3. Vercel (deploy frontend, needs backend URL)
        ↓
4. Render (update CORS_ALLOWED_ORIGINS with Vercel domain)
```

---

## Phase 1 — Code Changes (do before deploying)

### 1.1 Add explicit datasource config to `application.properties`

File: `api/src/main/resources/application.properties`

Add these lines (they fall back to the Docker Compose auto-config when the env vars are absent locally):

```properties
spring.datasource.url=${DB_URL:}
spring.datasource.username=${DB_USERNAME:}
spring.datasource.password=${DB_PASSWORD:}
```

### 1.2 Add datasource vars to `.env.development` (for local parity testing)

File: `api/.env.development`

```properties
DB_URL=jdbc:postgresql://127.0.0.1:5432/easytennis?ApplicationName=api
DB_USERNAME=easytennis
DB_PASSWORD=easytennis
```

This keeps local Docker Compose working and lets you test the explicit datasource path locally.

### 1.3 Create `api/Dockerfile` (multi-stage build)

```dockerfile
# ── Build stage ──────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

> **Why skip tests in Docker?** Integration tests require a running Postgres. Run tests locally or in CI, not inside the image build.

---

## Phase 2 — Neon Setup (manual)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project → name it `easytennis`
3. Copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/easytennis
   ```
4. Convert to JDBC format and append SSL flag:
   ```
   jdbc:postgresql://ep-xxx.us-east-2.aws.neon.tech/easytennis?sslmode=require
   ```
5. Save the username, password, and JDBC URL — you'll need them in Phase 3.

> Neon **requires** `?sslmode=require`. Omitting it causes a connection refused error.

---

## Phase 3 — Render Setup (manual)

### 3.1 Create the web service

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repository
3. Settings:
   - **Root directory:** `api`
   - **Environment:** Docker
   - **Dockerfile path:** `api/Dockerfile`
   - **Instance type:** Free (or Starter for no sleep)

### 3.2 Set environment variables on Render

| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://ep-xxx.../easytennis?sslmode=require` |
| `DB_USERNAME` | Neon username |
| `DB_PASSWORD` | Neon password |
| `JWT_SECRET` | Long random string (≥ 64 chars) — generate with `openssl rand -hex 64` |
| `JWT_EXPIRATION_MS` | `86400000` (24 h) |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` *(update after Vercel deploy)* |
| `MAIL_USER` | Gmail address (e.g. `arthurnetworkbr@gmail.com`) |
| `MAIL_PASSWORD` | Gmail app password (16-char, no spaces) |
| `SPRING_DOCKER_COMPOSE_ENABLED` | `false` |

> `SPRING_DOCKER_COMPOSE_ENABLED=false` is critical — Render has no Docker daemon, so the Spring Boot Docker Compose integration must be disabled or the app crashes on startup.

### 3.3 Note the Render service URL

After the first deploy completes, copy the URL: `https://easytennis-api.onrender.com` (or similar). You'll need it for Vercel.

---

## Phase 4 — Vercel Setup (manual)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import the GitHub repository
3. Settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
4. Add environment variable:
   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://easytennis-api.onrender.com` |
5. Deploy

After deploy, copy the Vercel domain: `https://your-app.vercel.app`

---

## Phase 5 — Wire CORS and Verify

### 5.1 Update CORS on Render

Go back to Render → your service → Environment → update:

```
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
```

Trigger a manual redeploy.

### 5.2 End-to-end smoke test

- [ ] `POST /auth/register` — new account created
- [ ] `POST /auth/login` — JWT returned
- [ ] `GET /game-days` — 200 with auth header
- [ ] `POST /game-days` — game day created
- [ ] `POST /auth/forgot-password` — email received
- [ ] Full password reset flow completes
- [ ] Cost split calculation returns correct amounts

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Render free tier sleeps after 15 min inactivity | Medium | Upgrade to Starter ($7/mo) or use a cron ping |
| Neon free tier connection limits | Low | 10 connections max; HikariCP default pool is 10 — set `spring.datasource.hikari.maximum-pool-size=5` |
| Gmail app password rotated | Low | Re-set `MAIL_PASSWORD` in Render env vars |
| CORS misconfiguration after domain change | Medium | Always update `CORS_ALLOWED_ORIGINS` before testing from Vercel |
| Docker Compose active on Render | High | Always set `SPRING_DOCKER_COMPOSE_ENABLED=false` |

---

## Checklist

- [ ] Phase 1 code changes committed and pushed
- [ ] Neon project created, JDBC URL obtained
- [ ] Render service deployed, all 9 env vars set
- [ ] Vercel project deployed with `NEXT_PUBLIC_API_BASE_URL`
- [ ] `CORS_ALLOWED_ORIGINS` updated on Render with Vercel domain
- [ ] Smoke test passed (all 7 checks above)
